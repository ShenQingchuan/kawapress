/** Process, logging, and JSON helpers shared by the release steps. */

import { spawn } from 'node:child_process'
import { access, readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'

import { rootDir } from './constants.mjs'

export class CommandError extends Error {
  constructor(command, args, result) {
    const renderedCommand = [command, ...args].join(' ')
    const details = result.stderr.trim() || result.stdout.trim()
    super(`Command failed: ${renderedCommand}${details ? `\n${details}` : ''}`)
    this.name = 'CommandError'
    this.command = renderedCommand
    this.exitCode = result.exitCode
    this.stderr = result.stderr
    this.stdout = result.stdout
  }
}

/**
 * Runs a command with inherited stdio, or captures its output.
 * Returns `{ exitCode, stderr, stdout }`; rejects with a `CommandError` unless `allowFailure` is set.
 */
export function run(command, args, options = {}) {
  const {
    allowFailure = false,
    capture = false,
    cwd = rootDir,
    env = process.env,
    interactive = false,
  } = options

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env,
      // `interactive` captures stdout only: the command may still ask the person at the
      // terminal for something, such as npm's two-factor prompt.
      stdio: interactive ? ['inherit', 'pipe', 'inherit'] : capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    })
    let stderr = ''
    let stdout = ''

    if (capture || interactive) {
      child.stdout.setEncoding('utf8')
      child.stdout.on('data', (chunk) => {
        stdout += chunk
      })
    }
    if (capture) {
      child.stderr.setEncoding('utf8')
      child.stderr.on('data', (chunk) => {
        stderr += chunk
      })
    }

    child.on('error', rejectPromise)
    child.on('close', (exitCode) => {
      const result = { exitCode, stderr, stdout }
      if (exitCode === 0 || allowFailure)
        resolvePromise(result)
      else
        rejectPromise(new CommandError(command, args, result))
    })
  })
}

/**
 * Arguments that run a command inside a pseudo-terminal through `script`, or `null` when
 * this platform has none. The command then sees a real terminal on stdin and stdout.
 */
export function pseudoTerminalCommand(command, args, platform = process.platform) {
  if (platform === 'darwin')
    return ['script', ['-q', '/dev/null', command, ...args]]
  if (platform === 'linux')
    return ['script', ['-qec', [command, ...args].map(shellQuote).join(' '), '/dev/null']]
  return null
}

function shellQuote(value) {
  return `'${String(value).replaceAll('\'', '\'\\\'\'')}'`
}

/**
 * Runs a command that may need the person at the terminal, for example npm asking for
 * two-factor approval, and still returns what it printed. npm only offers that prompt when
 * stdin and stdout are a terminal, so the command gets a pseudo-terminal and its output is
 * both captured and shown. Output after `quietAfter` is captured without being shown.
 */
export function runOnTerminal(command, args, options = {}) {
  const { quietAfter = '{', env = process.env } = options
  const wrapped = pseudoTerminalCommand(command, args)
  if (!wrapped || !process.stdin.isTTY)
    return run(command, args, { capture: true, env })

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(wrapped[0], wrapped[1], { env, stdio: ['inherit', 'pipe', 'inherit'] })
    let stdout = ''
    let quiet = false

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      stdout += chunk
      if (!quiet && stdout.includes(quietAfter))
        quiet = true
      if (!quiet)
        process.stdout.write(chunk)
    })
    child.on('error', rejectPromise)
    child.on('close', (exitCode) => {
      const result = { exitCode, stderr: '', stdout }
      if (exitCode === 0)
        resolvePromise(result)
      else
        rejectPromise(new CommandError(command, args, result))
    })
  })
}

export function logStep(message) {
  console.log(`\n▶ ${message}`)
}

export function logSuccess(message) {
  console.log(`✓ ${message}`)
}

export function logWarning(message) {
  console.warn(`! ${message}`)
}

export async function pathExists(path) {
  try {
    await access(path)
    return true
  }
  catch {
    return false
  }
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

export async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}
