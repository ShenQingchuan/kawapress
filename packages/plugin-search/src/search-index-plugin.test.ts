import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadSearchIndex, tokenizeSearchText } from './search'
import { createSearchDocuments, loadSearchIndexes } from './search-index-plugin'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => (
    rm(directory, { force: true, recursive: true })
  )))
})

describe('search index plugin', () => {
  it('splits Markdown into linked heading sections', () => {
    const documents = createSearchDocuments(`---
title: 入门
---
# 快速 **开始**

先创建一个项目。

## 安装

运行 \`npm install\`。

## 安装

也可以使用 pnpm。
`, '/guide/getting-started')

    expect(documents).toEqual([
      {
        id: '/guide/getting-started',
        title: '快速 开始',
        titles: [],
        text: '先创建一个项目。',
      },
      {
        id: '/guide/getting-started#%E5%AE%89%E8%A3%85',
        title: '安装',
        titles: ['快速 开始'],
        text: '运行 npm install。',
      },
      {
        id: '/guide/getting-started#%E5%AE%89%E8%A3%85-1',
        title: '安装',
        titles: ['快速 开始'],
        text: '也可以使用 pnpm。',
      },
    ])
  })

  it('indexes a localized GitHub alert title and body without its marker', () => {
    expect(createSearchDocuments(
      '# Page\n\n> [!IMPORTANT]\n> Keep alerts searchable.\n',
      '/guide/page',
      { callouts: { githubAlerts: true } },
    )).toEqual([{
      id: '/guide/page',
      title: 'Page',
      titles: [],
      text: 'Important Keep alerts searchable.',
    }])
    expect(createSearchDocuments(
      '# 页面\n\n> [!IMPORTANT]\n> 警报正文。\n',
      '/guide/page',
      {
        language: 'zh-CN',
        localeIndex: 'root',
        callouts: {
          githubAlerts: {
            localeLabels: {
              root: { important: '必须阅读' },
            },
          },
        },
      },
    )).toEqual([{
      id: '/guide/page',
      title: '页面',
      titles: [],
      text: '必须阅读 警报正文。',
    }])
  })

  it('does not invent alert titles when alert indexing is disabled', () => {
    expect(createSearchDocuments(
      '# Page\n\n> [!IMPORTANT]\n> Ordinary quote text.\n',
      '/guide/page',
    )[0]?.text).toBe('[!IMPORTANT] Ordinary quote text.')
  })

  it('keeps literal, escaped, and nested alert markers as ordinary text', () => {
    expect(createSearchDocuments(`# Page

[!NOTE]
Literal marker.

> \\[!TIP]
> Escaped marker.

- > [!WARNING]
  > Nested marker.
`, '/guide/page', {
      callouts: { githubAlerts: true },
    })[0]?.text).toBe(
      '[!NOTE] Literal marker. [!TIP] Escaped marker. [!WARNING] Nested marker.',
    )
  })

  it('indexes custom container titles and bodies without fence markers', () => {
    expect(createSearchDocuments(`# Page

::: tip **[Docs][docs]**
Keep this searchable.
:::

[docs]: /guide
`, '/guide/page', {
      callouts: { containers: true },
    })).toEqual([{
      id: '/guide/page',
      title: 'Page',
      titles: [],
      text: 'Docs Keep this searchable.',
    }])
  })

  it('keeps unsupported container syntax searchable', () => {
    expect(createSearchDocuments(`# Page

::: raw
Literal raw marker.
:::
`, '/guide/page', {
      callouts: { containers: true },
    })[0]?.text).toBe(
      '::: raw Literal raw marker. :::',
    )
  })

  it('uses custom heading anchors for search section links', () => {
    const documents = createSearchDocuments(`# 页面\n\n介绍。\n\n## 配置 {#configuration}\n\n配置正文。\n`, '/guide/page')

    expect(documents[1]).toMatchObject({
      id: '/guide/page#configuration',
      title: '配置',
      text: '配置正文。',
    })
  })

  it('excludes pages that disable search', () => {
    expect(createSearchDocuments(`---
search: false
---
# Hidden
`, '/hidden')).toEqual([])
  })

  it('builds independently loadable indexes for each locale', async () => {
    const sourceRoot = await createTemporaryDirectory()
    await mkdir(join(sourceRoot, 'guide'), { recursive: true })
    await mkdir(join(sourceRoot, 'en', 'guide'), { recursive: true })
    await writeFile(join(sourceRoot, 'guide', 'start.md'), `# 快速开始

几分钟内创建优雅的文档。

> [!IMPORTANT]
> 请保留警报正文。
`)
    await writeFile(join(sourceRoot, 'en', 'guide', 'start.md'), `# Getting Started

Create beautiful documentation in minutes.

> [!TIP]
> Keep alert content searchable.
`)

    const serialized = await loadSearchIndexes(
      sourceRoot,
      ['root', 'en'],
      {
        localeLanguages: { root: 'zh-CN', en: 'en' },
        callouts: {
          containers: true,
          githubAlerts: true,
        },
      },
    )
    const chinese = loadSearchIndex(serialized.root)
    const english = loadSearchIndex(serialized.en)

    expect(chinese.search('快速').map(result => result.id))
      .toEqual(['/guide/start'])
    expect(chinese.search('documentation')).toEqual([])
    expect(english.search('documentation').map(result => result.id))
      .toEqual(['/en/guide/start'])
    expect(chinese.search('重要').map(result => result.id))
      .toEqual(['/guide/start'])
    expect(english.search('Tip').map(result => result.id))
      .toEqual(['/en/guide/start'])
    expect(english.search('快速')).toEqual([])
  })

  it('tokenizes CJK characters and Latin words consistently', () => {
    expect(tokenizeSearchText('快速开始 with KawaPress 0.1'))
      .toEqual(['快', '速', '开', '始', 'with', 'KawaPress', '0', '1'])
  })
})

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'kawapress-search-'))
  temporaryDirectories.push(directory)
  return directory
}
