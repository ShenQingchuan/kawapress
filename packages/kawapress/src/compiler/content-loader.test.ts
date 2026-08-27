import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createContentLoader, installContentLoaderExecutor } from '../api/data'
import { resolveSiteConfig } from '../generator/config'
import { createDataLoaderContext, installDataLoaderContext } from '../generator/data/context'
import { createContentLoaderExecutor } from './content-loader'

describe('createContentLoader', () => {
  it('loads Markdown relative to srcDir with optional source, HTML, and excerpts', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-content-loader-'))
    const sourceRoot = join(root, 'content')

    try {
      await mkdir(join(sourceRoot, 'posts'), { recursive: true })
      await Promise.all([
        writeFile(join(sourceRoot, 'posts/index.md'), `---
title: Posts
---

Intro [Next](./next.md).

---

The rest of the page.
`),
        writeFile(join(sourceRoot, 'posts/next.md'), `{
  "title": "Next",
  "draft": false
}

# Next
`),
        writeFile(join(sourceRoot, 'posts/ignored.txt'), 'not Markdown\n'),
      ])
      await installContext(root, 'content', '/docs/')

      const loader = createContentLoader('posts/*', {
        excerpt: true,
        includeSrc: true,
        render: true,
      })
      const data = await loader.load()

      expect(data.map(entry => entry.url)).toEqual([
        '/posts',
        '/posts/next',
      ])
      expect(data[0]).toMatchObject({
        frontmatter: { title: 'Posts' },
        url: '/posts',
      })
      expect(data[0].src).toContain('The rest of the page.')
      expect(data[0].html).toContain('href="/docs/posts/next"')
      expect(data[0].excerpt).toContain('href="/docs/posts/next"')
      expect(data[0].excerpt).not.toContain('The rest of the page.')
      expect(data[1].frontmatter).toEqual({
        draft: false,
        title: 'Next',
      })
      expect(Object.hasOwn(data[1], 'excerpt')).toBe(false)
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  it('supports async transforms and rejects patterns outside srcDir', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-content-transform-'))

    try {
      await mkdir(join(root, 'content/notes'), { recursive: true })
      await Promise.all([
        writeFile(join(root, 'content/notes/b.md'), '---\ntitle: B\n---\n'),
        writeFile(join(root, 'content/notes/a.md'), '---\ntitle: A\n---\n'),
      ])
      await installContext(root, 'content', '/')

      const loader = createContentLoader('notes/*.md', {
        async transform(data) {
          return data.map(entry => ({
            title: entry.frontmatter.title,
            url: entry.url,
          }))
        },
      })

      await expect(loader.load()).resolves.toEqual([
        { title: 'A', url: '/notes/a' },
        { title: 'B', url: '/notes/b' },
      ])
      await expect(createContentLoader('../outside/*.md').load()).rejects.toThrow(
        'pattern must stay inside srcDir',
      )
      await expect(createContentLoader('/absolute/*.md').load()).rejects.toThrow(
        'pattern must stay inside srcDir',
      )
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })
})

async function installContext(
  root: string,
  srcDir: string,
  base: string,
): Promise<void> {
  const config = await resolveSiteConfig({ base, srcDir })
  const context = createDataLoaderContext(root, config)
  installDataLoaderContext(context)
  installContentLoaderExecutor(createContentLoaderExecutor(context))
}
