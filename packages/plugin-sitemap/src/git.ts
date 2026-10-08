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

/**
 * 批量读取站点目录下每个文件最后一次提交的时间（毫秒）。
 * 仓库不可用或为浅克隆时返回 `undefined`，并给出 warning，不输出错误日期。
 */
export async function readGitLastUpdated(
  siteRoot: string,
): Promise<Map<string, number> | undefined> {
  try {
    await runGit(siteRoot, ['rev-parse', '--is-inside-work-tree'])
  }
  catch {
    consola.warn('KawaPress Sitemap: 当前目录不在 git 仓库中，已跳过 lastmod。')
    return undefined
  }

  const shallow = (await runGit(siteRoot, ['rev-parse', '--is-shallow-repository'])).trim()
  if (shallow === 'true') {
    consola.warn('KawaPress Sitemap: 当前仓库是浅克隆，已跳过 lastmod。请在 CI 中设置 fetch-depth: 0。')
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
      // git 输出按时间从新到旧排列，第一次出现即为最后一次提交
      const absolute = resolve(siteRoot, name)
      if (!timestamps.has(absolute)) {
        timestamps.set(absolute, seconds * 1000)
      }
    }
  }
  return timestamps
}
