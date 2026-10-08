import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { consola } from 'consola'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseGitLog, readGitLastUpdated } from './git'

const directories: string[] = []

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(directories.splice(0).map(directory => rm(directory, { force: true, recursive: true })))
})

async function createDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'kawapress-sitemap-git-'))
  directories.push(directory)
  return directory
}

function git(cwd: string, args: string[], date?: string): string {
  return execFileSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.com', ...args], {
    cwd,
    encoding: 'utf8',
    env: date
      ? { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }
      : process.env,
  })
}

describe('parseGitLog', () => {
  it('maps each file to the first (newest) commit timestamp', () => {
    const output = '\x1E1700000000\0\n_guide/a.md\0_guide/b.md\0\x1E1600000000\0\nguide/a.md\0index.md\0'
    const map = parseGitLog(output, '/site')

    expect(map.get(resolve('/site', '_guide/a.md'))).toBe(1_700_000_000_000)
    expect(map.get(resolve('/site', '_guide/b.md'))).toBe(1_700_000_000_000)
    expect(map.get(resolve('/site', 'index.md'))).toBe(1_600_000_000_000)
  })
})

describe('readGitLastUpdated', () => {
  it('returns undefined and warns outside a git repository', async () => {
    const warn = vi.spyOn(consola, 'warn').mockImplementation(() => {})
    const directory = await createDirectory()

    expect(await readGitLastUpdated(directory)).toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('不在 git 仓库'))
  })

  it('reads the last commit time of each markdown file', async () => {
    const directory = await createDirectory()
    git(directory, ['init', '-q'])
    await writeFile(join(directory, 'index.md'), '# Home\n')
    git(directory, ['add', '-A'])
    git(directory, ['commit', '-q', '-m', 'init'], '2024-01-02T03:04:05Z')

    const map = await readGitLastUpdated(directory)
    expect(map?.get(join(directory, 'index.md'))).toBe(Date.parse('2024-01-02T03:04:05Z'))
  })

  it('returns undefined and warns for a shallow clone', async () => {
    const warn = vi.spyOn(consola, 'warn').mockImplementation(() => {})
    const origin = await createDirectory()
    git(origin, ['init', '-q'])
    await writeFile(join(origin, 'index.md'), '# One\n')
    git(origin, ['add', '-A'])
    git(origin, ['commit', '-q', '-m', 'one'], '2024-01-01T00:00:00Z')
    await writeFile(join(origin, 'index.md'), '# Two\n')
    git(origin, ['commit', '-q', '-am', 'two'], '2024-02-01T00:00:00Z')

    const clone = join(await createDirectory(), 'clone')
    execFileSync('git', ['clone', '-q', '--depth', '1', `file://${origin}`, clone])

    expect(await readGitLastUpdated(clone)).toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('浅克隆'))
  })
})
