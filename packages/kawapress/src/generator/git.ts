import { execFile } from 'node:child_process'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { consola } from 'consola'

const execFileAsync = promisify(execFile)
const RECORD_SEPARATOR = '\x1E'
const MAX_BUFFER = 256 * 1024 * 1024

async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, maxBuffer: MAX_BUFFER })
  return stdout
}

export interface ReadGitLastUpdatedOptions {
  /** Prefix of the warning, naming the caller, e.g. `KawaPress Sitemap`. */
  label: string
  /** What the caller skips when git history is unavailable, e.g. `lastmod`. */
  skipped: string
}

/**
 * Reads the last commit time (milliseconds) of every file under the site root
 * in one `git log` call, keyed by absolute path. Returns `undefined` with a
 * warning outside a git repository or in a shallow clone, where the dates
 * would be wrong.
 */
export async function readGitLastUpdated(
  siteRoot: string,
  { label, skipped }: ReadGitLastUpdatedOptions,
): Promise<Map<string, number> | undefined> {
  try {
    await runGit(siteRoot, ['rev-parse', '--is-inside-work-tree'])
  }
  catch {
    consola.warn(`${label}: the site is not inside a git repository, ${skipped} is skipped.`)
    return undefined
  }

  const shallow = (await runGit(siteRoot, ['rev-parse', '--is-shallow-repository'])).trim()
  if (shallow === 'true') {
    consola.warn(`${label}: the repository is a shallow clone, ${skipped} is skipped. Fetch the full history in CI, e.g. \`fetch-depth: 0\` for actions/checkout.`)
    return undefined
  }

  const output = await runGit(siteRoot, [
    'log',
    '--format=%x1e%at',
    '--name-only',
    '-z',
    '--relative',
    '--',
    '.',
  ])
  return parseGitLog(output, siteRoot)
}

export function parseGitLog(output: string, siteRoot: string): Map<string, number> {
  const timestamps = new Map<string, number>()
  for (const record of output.split(RECORD_SEPARATOR)) {
    const [head = '', ...files] = record.split('\0')
    const seconds = Number.parseInt(head.trim(), 10)
    if (!(seconds > 0)) {
      continue
    }
    for (const file of files) {
      const name = file.replace(/^\n+/, '')
      if (!name) {
        continue
      }
      // git log lists commits newest first, so the first time wins
      const absolute = resolve(siteRoot, name)
      if (!timestamps.has(absolute)) {
        timestamps.set(absolute, seconds * 1000)
      }
    }
  }
  return timestamps
}
