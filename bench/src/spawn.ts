import type { Buffer } from 'node:buffer'
import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { connect } from 'node:net'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'

/** How many characters of child output are kept for error messages. */
const OUTPUT_LIMIT = 20_000
const DEFAULT_POLL_INTERVAL_MS = 50

export interface CommandResult {
  durationMs: number
  stdout: string
  stderr: string
}

export interface RunCommandOptions {
  cwd: string
  timeoutMs?: number
}

/** A long running child process, started in its own process group so it can be killed as a tree. */
export interface DetachedProcess {
  child: ChildProcess
  /** Output collected so far, used to explain failures. */
  output: () => string
  stop: () => Promise<void>
}

export function formatCommand(command: readonly string[]): string {
  return command.map(part => /\s/.test(part) ? JSON.stringify(part) : part).join(' ')
}

function appendOutput(current: string, chunk: Buffer): string {
  const next = current + chunk.toString('utf-8')
  return next.length > OUTPUT_LIMIT ? next.slice(-OUTPUT_LIMIT) : next
}

function tailOutput(output: string): string {
  const lines = output.trim().split('\n')
  return lines.slice(-20).join('\n')
}

/** Run a command to completion and measure the wall clock time around the child process. */
export async function runCommand(
  command: readonly string[],
  options: RunCommandOptions,
): Promise<CommandResult> {
  const startedAt = performance.now()
  return new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(command[0]!, command.slice(1), {
      cwd: options.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let timer: NodeJS.Timeout | undefined

    const finish = (): void => {
      if (timer) {
        clearTimeout(timer)
      }
    }

    child.stdout!.on('data', (chunk: Buffer) => {
      stdout = appendOutput(stdout, chunk)
    })
    child.stderr!.on('data', (chunk: Buffer) => {
      stderr = appendOutput(stderr, chunk)
    })
    child.once('error', (error) => {
      finish()
      reject(new Error(
        `Benchmark: could not start \`${formatCommand(command)}\` in ${options.cwd}\n${error.message}`,
      ))
    })
    child.once('close', (code, signal) => {
      finish()
      const durationMs = performance.now() - startedAt
      if (code === 0) {
        resolve({ durationMs, stdout, stderr })
        return
      }
      reject(new Error([
        `Benchmark: \`${formatCommand(command)}\` failed in ${options.cwd}`,
        `  exit code: ${code ?? 'none'}${signal ? ` (signal ${signal})` : ''}`,
        '  last output lines:',
        tailOutput(`${stdout}\n${stderr}`).replace(/^/gm, '    '),
      ].join('\n')))
    })

    if (options.timeoutMs !== undefined) {
      timer = setTimeout(() => {
        void killProcessTree(child)
        reject(new Error(
          `Benchmark: \`${formatCommand(command)}\` did not finish within ${options.timeoutMs}ms in ${options.cwd}`,
        ))
      }, options.timeoutMs)
    }
  })
}

/** Start a long running command (a dev or preview server) in its own process group. */
export function spawnDetached(
  command: readonly string[],
  options: { cwd: string },
): DetachedProcess {
  const child = spawn(command[0]!, command.slice(1), {
    cwd: options.cwd,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout!.on('data', (chunk: Buffer) => {
    output = appendOutput(output, chunk)
  })
  child.stderr!.on('data', (chunk: Buffer) => {
    output = appendOutput(output, chunk)
  })
  return {
    child,
    output: () => output,
    stop: () => killProcessTree(child),
  }
}

async function killProcessTree(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return
  }
  const exited = new Promise<void>((resolve) => {
    child.once('exit', () => resolve())
  })
  try {
    process.kill(-child.pid!, 'SIGKILL')
  }
  catch {
    child.kill('SIGKILL')
  }
  await Promise.race([exited, delay(5_000)])
}

/**
 * Both tools bind the loopback address differently: Vite dev servers listen on
 * `localhost` (IPv6 `::1` first), while KawaPress listens on every interface.
 * The benchmark therefore asks both loopback addresses.
 */
const LOOPBACK_HOSTS = ['127.0.0.1', '::1'] as const

function localUrl(port: number, host: string, path = '/'): string {
  return `http://${host.includes(':') ? `[${host}]` : host}:${port}${path}`
}

function isHostPortFree(port: number, host: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = connect({ port, host })
    socket.setTimeout(500)
    socket.once('connect', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(true)
    })
  })
}

/** Check whether nothing is listening on the port on either loopback address. */
export async function isPortFree(port: number): Promise<boolean> {
  const results = await Promise.all(LOOPBACK_HOSTS.map(host => isHostPortFree(port, host)))
  return results.every(Boolean)
}

/** URL of `path` on every loopback address, so a server on either stack is found. */
export function loopbackUrls(port: number, path = '/'): string[] {
  return LOOPBACK_HOSTS.map(host => localUrl(port, host, path))
}

/**
 * Poll the loopback addresses of `port` until one of them accepts a connection.
 *
 * A plain TCP connection is used instead of an HTTP request: the dev server therefore
 * renders no page for the check, and a browser can be pointed at a host that is known
 * to be listening. Navigating to a refused host costs a Chromium error page, which
 * interrupts the following navigation.
 *
 * @returns the URL of the first address that accepted a connection.
 */
export async function waitForListeningUrl(
  port: number,
  options: { timeoutMs: number },
): Promise<string> {
  const deadline = performance.now() + options.timeoutMs
  while (performance.now() < deadline) {
    for (const host of LOOPBACK_HOSTS) {
      if (!(await isHostPortFree(port, host))) {
        return localUrl(port, host)
      }
    }
    await delay(DEFAULT_POLL_INTERVAL_MS)
  }
  throw new Error(
    `Benchmark: nothing accepted a connection on ${loopbackUrls(port).join(', ')} within ${options.timeoutMs}ms.`,
  )
}

async function respondsWithHtml(url: string, lastAttempt: { value: string }): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: { accept: 'text/html' },
      signal: AbortSignal.timeout(5_000),
    })
    const contentType = response.headers.get('content-type') ?? ''
    const body = await response.text()
    if (response.ok && contentType.includes('text/html') && /<html/i.test(body)) {
      return true
    }
    lastAttempt.value = `${url} answered HTTP ${response.status} (${contentType || 'no content type'})`
  }
  catch (error) {
    lastAttempt.value = `${url}: ${error instanceof Error ? error.message : String(error)}`
  }
  return false
}

/** Poll the given URLs until one of them answers with an HTML document. */
export async function waitForFirstHtml(
  urls: readonly string[],
  options: { timeoutMs: number },
): Promise<string> {
  const deadline = performance.now() + options.timeoutMs
  const lastAttempt = { value: 'no attempt yet' }
  while (performance.now() < deadline) {
    for (const url of urls) {
      if (await respondsWithHtml(url, lastAttempt)) {
        return url
      }
    }
    await delay(DEFAULT_POLL_INTERVAL_MS)
  }
  throw new Error(
    `Benchmark: none of ${urls.join(', ')} returned HTML within ${options.timeoutMs}ms. Last attempt: ${lastAttempt.value}`,
  )
}

/** Wait until the port is released again, so the next run starts clean. */
export async function waitForPortRelease(
  port: number,
  options: { timeoutMs: number } = { timeoutMs: 10_000 },
): Promise<void> {
  const deadline = performance.now() + options.timeoutMs
  while (performance.now() < deadline) {
    if (await isPortFree(port)) {
      return
    }
    await delay(DEFAULT_POLL_INTERVAL_MS)
  }
  throw new Error(
    `Benchmark: port ${port} is still in use ${options.timeoutMs}ms after the process was killed. Stop it with \`lsof -ti :${port} | xargs kill -9\`.`,
  )
}
