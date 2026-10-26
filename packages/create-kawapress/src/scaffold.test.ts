import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { assertEmptyTargetDirectory, writeProject } from './scaffold'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'create-kawapress-'))
})

afterEach(async () => {
  await rm(root, { force: true, recursive: true })
})

describe('assertEmptyTargetDirectory', () => {
  it('accepts a directory that does not exist yet', async () => {
    await expect(assertEmptyTargetDirectory(join(root, 'missing'))).resolves.toBeUndefined()
  })

  it('accepts an empty directory', async () => {
    await expect(assertEmptyTargetDirectory(root)).resolves.toBeUndefined()
  })

  it('accepts a directory that only contains .git', async () => {
    await mkdir(join(root, '.git'))

    await expect(assertEmptyTargetDirectory(root)).resolves.toBeUndefined()
  })

  it('lists the entries that block the target directory', async () => {
    await writeFile(join(root, 'notes.txt'), 'hello')
    await mkdir(join(root, 'src'))

    await expect(assertEmptyTargetDirectory(root)).rejects.toThrow(
      `Cannot create a project in ${root}: the directory is not empty.\n`
      + 'Remove or move these entries first: notes.txt, src\n'
      + 'Or choose a directory that does not exist yet.',
    )
  })
})

describe('writeProject', () => {
  it('writes every planned file with rendered content', async () => {
    const directory = join(root, 'my-site')

    const written = await writeProject({
      directory,
      projectName: 'my-site',
      title: 'My Docs',
      kawapressVersion: '0.0.1',
      language: 'en',
      secondLanguage: 'zh-CN',
    })

    expect(written).toEqual([
      '.gitignore',
      'package.json',
      'kawapress.config.ts',
      'index.md',
      'guide/getting-started.md',
      'zh/index.md',
      'zh/guide/getting-started.md',
    ])
    expect(JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))).toMatchObject({
      name: 'my-site',
      private: true,
      type: 'module',
      devDependencies: { kawapress: '^0.0.1' },
    })
    expect(await readFile(join(directory, 'kawapress.config.ts'), 'utf8')).toContain(
      'title: "My Docs",',
    )
    expect(await readFile(join(directory, 'zh/guide/getting-started.md'), 'utf8')).toContain(
      '[回到首页](/zh/)',
    )
  })

  it('creates the target directory when it does not exist', async () => {
    const directory = join(root, 'nested', 'my-site')

    await writeProject({
      directory,
      projectName: 'my-site',
      title: 'My Docs',
      kawapressVersion: '0.0.1',
      language: 'en',
      secondLanguage: 'none',
    })

    expect(await readFile(join(directory, '.gitignore'), 'utf8')).toBe(
      'node_modules\ndist\n.DS_Store\n',
    )
  })

  it('does not write anything into a directory with existing content', async () => {
    const directory = join(root, 'my-site')
    await mkdir(directory)
    await writeFile(join(directory, 'index.md'), '# Existing')

    await expect(writeProject({
      directory,
      projectName: 'my-site',
      title: 'My Docs',
      kawapressVersion: '0.0.1',
      language: 'en',
      secondLanguage: 'none',
    })).rejects.toThrow('the directory is not empty')

    expect(await readFile(join(directory, 'index.md'), 'utf8')).toBe('# Existing')
  })
})
