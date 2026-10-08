import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { consola } from 'consola'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildSite } from '../../kawapress/src/server/build'

const temporaryDirectories: string[] = []
const PACKAGE_ROOT = fileURLToPath(new URL('../', import.meta.url))

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(temporaryDirectories.splice(0).map(directory => (
    rm(directory, { force: true, recursive: true })
  )))
})

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(PACKAGE_ROOT, 'kawapress-sitemap-'))
  temporaryDirectories.push(directory)
  return directory
}

async function writeSite(root: string, config: string, pages: Record<string, string>): Promise<void> {
  await writeFile(join(root, 'kawapress.config.ts'), config)
  for (const [path, content] of Object.entries(pages)) {
    const file = join(root, path)
    await mkdir(join(file, '..'), { recursive: true })
    await writeFile(file, content)
  }
}

const localesConfig = `
  locales: {
    root: { label: '简体中文', lang: 'zh-CN' },
    en: { label: 'English', lang: 'en' },
  },
`

describe('sitemap plugin', () => {
  it('stays off without a hostname', async () => {
    const start = vi.spyOn(consola, 'start')
    const root = await createTemporaryDirectory()
    await writeSite(root, `
import { nagi } from 'kawapress/nagi'

export default nagi({ title: 'Off' })
`, {
      'index.md': '# Home\n',
    })

    await buildSite(root)

    await expect(readFile(join(root, 'dist/sitemap.xml'), 'utf8')).rejects.toThrow()
    expect(start).not.toHaveBeenCalledWith(expect.stringContaining('sitemap'))
  })

  it('generates locale-aware entries under the site base with options and hooks', async () => {
    const start = vi.spyOn(consola, 'start')
    const success = vi.spyOn(consola, 'success')
    const root = await createTemporaryDirectory()
    await writeSite(root, `
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'Docs',
  base: '/docs/',
  ${localesConfig}
  sitemap: {
    hostname: 'https://example.com',
    xmlns: { news: false, xhtml: true, image: false, video: false },
    transformItems(items) {
      items.push({ url: 'extra-page', changefreq: 'monthly', priority: 0.8 })
      return items
    },
  },
})
`, {
      'index.md': '# Home\n',
      'guide.md': '# Guide\n',
      'hidden.md': '---\nsitemap: false\n---\n# Hidden\n',
      'en/index.md': '# Home\n',
      'en/guide.md': '# Guide\n',
    })

    await buildSite(root)

    const xml = await readFile(join(root, 'dist/sitemap.xml'), 'utf8')
    expect(start).toHaveBeenCalledWith('sitemap 正在生成中…')
    expect(success).toHaveBeenCalledWith(expect.stringContaining('sitemap 已生成'))
    expect(xml).toContain('<loc>https://example.com/docs/</loc>')
    expect(xml).toContain('<loc>https://example.com/docs/guide</loc>')
    expect(xml).toContain('<loc>https://example.com/docs/en/guide</loc>')
    expect(xml).toContain('<loc>https://example.com/docs/extra-page</loc>')
    expect(xml).toContain('href="https://example.com/docs/en/guide"')
    expect(xml).not.toContain('hidden')
  })

  it('writes lastmod from git history and honors frontmatter overrides', async () => {
    const root = await createTemporaryDirectory()
    await writeSite(root, `
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'Dated',
  sitemap: { hostname: 'https://example.com', lastUpdated: true },
})
`, {
      'index.md': '# Home\n',
      'guide.md': '# Guide\n',
      'manual.md': '---\nlastUpdated: "2023-05-06"\n---\n# Manual\n',
      'off.md': '---\nlastUpdated: false\n---\n# Off\n',
    })
    execFileSync('git', ['init', '-q'], { cwd: root })
    execFileSync('git', ['add', '-A'], { cwd: root })
    execFileSync('git', [
      '-c',
      'user.name=test',
      '-c',
      'user.email=test@example.com',
      'commit',
      '-q',
      '-m',
      'init',
    ], {
      cwd: root,
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: '2024-01-02T03:04:05Z',
        GIT_COMMITTER_DATE: '2024-01-02T03:04:05Z',
      },
    })

    await buildSite(root)

    const xml = await readFile(join(root, 'dist/sitemap.xml'), 'utf8')
    expect(xml).toMatch(/<loc>https:\/\/example\.com\/guide<\/loc>\s*<lastmod>2024-01-02T03:04:05\.000Z<\/lastmod>/)
    expect(xml).toMatch(/<loc>https:\/\/example\.com\/manual<\/loc>\s*<lastmod>2023-05-06T00:00:00\.000Z<\/lastmod>/)
    expect(xml).toMatch(/<loc>https:\/\/example\.com\/off<\/loc>\s*<\/url>/)
  })
})
