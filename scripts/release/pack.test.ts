import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { addMissingReadmes } from './pack.mjs'

const roots: string[] = []

async function makeDirs() {
  const root = await mkdtemp(join(tmpdir(), 'kawapress-readme-'))
  roots.push(root)
  const repo = join(root, 'repo')
  const pkg = join(root, 'pkg')
  await mkdir(repo)
  await mkdir(pkg)
  await writeFile(join(repo, 'README.md'), 'repo en')
  await writeFile(join(repo, 'README.zh-CN.md'), 'repo zh')
  return { pkg, repo }
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { force: true, recursive: true })))
})

describe('addMissingReadmes', () => {
  it('gives a package without READMEs the repository ones', async () => {
    const { pkg, repo } = await makeDirs()
    await addMissingReadmes(pkg, repo)
    expect(await readFile(join(pkg, 'README.md'), 'utf8')).toBe('repo en')
    expect(await readFile(join(pkg, 'README-zh-CN.md'), 'utf8')).toBe('repo zh')
  })

  it('keeps a README the package wrote itself', async () => {
    const { pkg, repo } = await makeDirs()
    await writeFile(join(pkg, 'README.md'), 'own en')
    await addMissingReadmes(pkg, repo)
    expect(await readFile(join(pkg, 'README.md'), 'utf8')).toBe('own en')
    expect(await readFile(join(pkg, 'README-zh-CN.md'), 'utf8')).toBe('repo zh')
  })
})
