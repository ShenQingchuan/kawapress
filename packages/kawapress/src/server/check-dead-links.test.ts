import type { MarkdownPageLoader } from '../compiler/page-loader'
import type { ResolvedSiteConfig } from '../generator/config'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { consola } from 'consola'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveSiteConfig } from '../generator/config'
import { createSitePageLoader } from '../generator/vite/config'
import { checkDeadLinks, listPublicFiles, reportDeadLinks } from './check-dead-links'

const FIXTURE = {
  'index.md': `---
title: Home
---

# Home

[guide](/guide)

[guide index file](./guide/index.md)

[anchor](/guide#setup)

[missing page](/missing)

[missing anchor](/guide#nope)

[same page](#home)

[dead same page](#nowhere)

[logo](/logo.png)

[missing logo](/missing.png)

[pdf](/files/a.pdf)

[external](https://vuejs.org/)
`,
  'guide/index.md': `# Guide

## Setup

[home](/)

[nowhere](/nowhere)
`,
  'guide/intro.md': `# Intro

[setup](./index.md#setup)

[broken anchor](./index.md#missing)

[dead page](./missing)
`,
  'public/logo.png': '',
  'public/files/a.pdf': '',
}

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'kawapress-dead-links-'))
  await Promise.all(Object.entries(FIXTURE).map(async ([path, content]) => {
    const file = join(root, path)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, content)
  }))
})

afterEach(async () => {
  vi.restoreAllMocks()
  await rm(root, { force: true, recursive: true })
})

describe('checkDeadLinks', () => {
  it('reports dead links of every compiled page', async () => {
    vi.spyOn(consola, 'error').mockImplementation(() => {})
    const siteConfig = await resolveSiteConfig({})
    const pageLoader = await loadFixturePages(root, siteConfig)

    await expect(checkDeadLinks({ root, siteConfig, pageLoader })).rejects.toThrow(
      'KawaPress: found 7 dead links.',
    )
  })

  it('reports page, anchor, and public file problems with source lines', async () => {
    const siteConfig = await resolveSiteConfig({})
    const pageLoader = await loadFixturePages(root, siteConfig)
    const error = vi.spyOn(consola, 'error').mockImplementation(() => {})

    await checkDeadLinks({ root, siteConfig, pageLoader }).catch(() => {})

    expect(error.mock.calls.map(([line]) => line)).toEqual([
      '/guide/index.md:7  /nowhere  missing-page',
      '/guide/intro.md:5  ./index.md#missing  missing-anchor',
      '/guide/intro.md:7  ./missing  missing-page',
      '/index.md:13  /missing  missing-page',
      '/index.md:15  /guide#nope  missing-anchor',
      '/index.md:19  #nowhere  missing-anchor',
      '/index.md:23  /missing.png  missing-file',
    ])
  })

  it('skips the check when the site sets deadLinks to false', async () => {
    const siteConfig: ResolvedSiteConfig = { ...await resolveSiteConfig({}), deadLinks: false }
    const pageLoader = await loadFixturePages(root, siteConfig)

    await expect(checkDeadLinks({ root, siteConfig, pageLoader })).resolves.toEqual([])
  })

  it('honors configured ignore patterns', async () => {
    const siteConfig: ResolvedSiteConfig = {
      ...await resolveSiteConfig({}),
      deadLinks: {
        level: 'warn' as const,
        ignore: [
          /^\/missing/,
          'missing logo',
          '/nowhere',
          link => link.target === '/guide#nope',
        ],
      },
    }
    const warn = vi.spyOn(consola, 'warn').mockImplementation(() => {})
    const pageLoader = await loadFixturePages(root, siteConfig)

    const deadLinks = await checkDeadLinks({ root, siteConfig, pageLoader })

    expect(deadLinks.map(link => `${link.source}:${link.line} ${link.target}`)).toEqual([
      '/guide/intro.md:5 /guide#missing',
      '/guide/intro.md:7 /guide/missing',
      '/index.md:19 #nowhere',
    ])
    expect(warn).toHaveBeenCalledWith('KawaPress: found 3 dead links.')
  })
})

describe('reportDeadLinks', () => {
  const deadLink = {
    href: './missing',
    target: '/guide/missing',
    source: '/guide/intro.md',
    line: 3,
    reason: 'missing-page' as const,
  }

  it('prints one line per link and throws at the error level', () => {
    const error = vi.spyOn(consola, 'error').mockImplementation(() => {})

    expect(() => reportDeadLinks([deadLink], { level: 'error', ignore: [] }))
      .toThrow('Fix the links listed above')

    expect(error.mock.calls.map(([line]) => line)).toEqual([
      '/guide/intro.md:3  ./missing  missing-page',
    ])
  })

  it('only warns at the warn level', () => {
    const warn = vi.spyOn(consola, 'warn').mockImplementation(() => {})

    expect(() => reportDeadLinks([deadLink], { level: 'warn', ignore: [] })).not.toThrow()

    expect(warn.mock.calls.map(([line]) => line)).toEqual([
      '/guide/intro.md:3  ./missing  missing-page',
      'KawaPress: found 1 dead link.',
    ])
  })

  it('stays silent when nothing is dead', () => {
    const warn = vi.spyOn(consola, 'warn').mockImplementation(() => {})

    reportDeadLinks([], { level: 'warn', ignore: [] })

    expect(warn).not.toHaveBeenCalled()
  })
})

describe('listPublicFiles', () => {
  it('lists files as paths relative to the public directory', async () => {
    expect(await listPublicFiles(join(root, 'public'))).toEqual([
      '/files/a.pdf',
      '/logo.png',
    ])
  })

  it('accepts a site without a public directory', async () => {
    expect(await listPublicFiles(join(root, 'missing'))).toEqual([])
  })
})

async function loadFixturePages(
  root: string,
  siteConfig: Awaited<ReturnType<typeof resolveSiteConfig>>,
): Promise<MarkdownPageLoader> {
  const pageLoader = createSitePageLoader(root, siteConfig)
  const entries = await readdir(root, { recursive: true, withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue
    }
    const file = join(entry.parentPath, entry.name)
    await pageLoader.load(await readFile(file, 'utf8'), file)
  }

  return pageLoader
}
