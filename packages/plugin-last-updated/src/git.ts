import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * Absolute path of the repository that contains `cwd`, or `undefined` when git
 * cannot report it, for example outside a repository.
 */
export async function readGitTopLevel(cwd: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['rev-parse', '--show-toplevel'],
      { cwd },
    )
    const topLevel = stdout.trim()
    return topLevel || undefined
  }
  catch {
    return undefined
  }
}
