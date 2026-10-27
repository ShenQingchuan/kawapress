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
  } = options

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    })
    let stderr = ''
    let stdout = ''

    if (capture) {
      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')
      child.stdout.on('data', (chunk) => {
        stdout += chunk
      })
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
