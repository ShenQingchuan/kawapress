import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isMarkdownPage, listMarkdownPages, markdownFileToRoutePath } from './pages'

let siteDirectory: string
let sourceRoot: string

beforeEach(async () => {
  siteDirectory = await mkdtemp(join(tmpdir(), 'kawapress-page-list-'))
  sourceRoot = join(siteDirectory, 'src')
  await mkdir(sourceRoot, { recursive: true })
})

afterEach(async () => {
  await rm(siteDirectory, { force: true, recursive: true })
})

async function writePage(file: string): Promise<void> {
  const path = join(sourceRoot, file)
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, `# ${file}\n`)
}

describe('listMarkdownPages', () => {
  it('reads every page in directory order, with its source and route path', async () => {
    await writePage('index.md')
    await writePage('guide/b.md')
    await writePage('guide/a.md')
    await writePage('guide/nested/index.md')

    const pages = await listMarkdownPages({ sourceRoot })

    expect(pages).toEqual([
      { file: join(sourceRoot, 'guide/a.md'), sourcePath: '/guide/a.md', routePath: '/guide/a' },
      { file: join(sourceRoot, 'guide/b.md'), sourcePath: '/guide/b.md', routePath: '/guide/b' },
      { file: join(sourceRoot, 'guide/nested/index.md'), sourcePath: '/guide/nested/index.md', routePath: '/guide/nested' },
      { file: join(sourceRoot, 'index.md'), sourcePath: '/index.md', routePath: '/' },
    ])
  })

  it('skips hidden directories, build output and installed packages', async () => {
    await writePage('index.md')
    await writePage('.vitepress/hidden.md')
    await writePage('dist/built.md')
    await writePage('node_modules/package/readme.md')
    await writePage('guide/a.md')

    const pages = await listMarkdownPages({ sourceRoot })

    expect(pages.map(page => page.routePath)).toEqual(['/guide/a', '/'])
  })

  it('skips the public directory, which is copied into the site as it is', async () => {
    await writePage('index.md')
    await writePage('public/notes.md')
    await writePage('guide/public.md')

    const pages = await listMarkdownPages({
      sourceRoot,
      publicDir: join(sourceRoot, 'public'),
    })

    expect(pages.map(page => page.routePath)).toEqual(['/guide/public', '/'])
  })
})

describe('isMarkdownPage', () => {
  it('accepts Markdown below the source root only', () => {
    expect(isMarkdownPage(join(sourceRoot, 'guide/a.md'), { sourceRoot })).toBe(true)
    expect(isMarkdownPage(join(sourceRoot, 'notes.txt'), { sourceRoot })).toBe(false)
    expect(isMarkdownPage(join(siteDirectory, 'outside.md'), { sourceRoot })).toBe(false)
  })

  it('rejects Markdown in the public directory', () => {
    const scope = { sourceRoot, publicDir: join(sourceRoot, 'public') }

    expect(isMarkdownPage(join(sourceRoot, 'public/notes.md'), scope)).toBe(false)
    expect(isMarkdownPage(join(sourceRoot, 'guide/a.md'), scope)).toBe(true)
  })
})

describe('markdownFileToRoutePath', () => {
  it('turns a file the dev server reports into the route the site serves', () => {
    expect(markdownFileToRoutePath(join(sourceRoot, 'index.md'), sourceRoot)).toBe('/')
    expect(markdownFileToRoutePath(join(sourceRoot, 'guide/intro.md'), sourceRoot))
      .toBe('/guide/intro')
    expect(markdownFileToRoutePath(join(sourceRoot, 'guide/zh-hans.md'), sourceRoot))
      .toBe('/guide/zh-hans')
  })
})
