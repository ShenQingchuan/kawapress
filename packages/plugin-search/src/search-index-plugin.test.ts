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
`)
    await writeFile(join(sourceRoot, 'en', 'guide', 'start.md'), `# Getting Started

Create beautiful documentation in minutes.
`)

    const serialized = await loadSearchIndexes(sourceRoot, ['root', 'en'])
    const chinese = loadSearchIndex(serialized.root)
    const english = loadSearchIndex(serialized.en)

    expect(chinese.search('快速').map(result => result.id))
      .toEqual(['/guide/start'])
    expect(chinese.search('documentation')).toEqual([])
    expect(english.search('documentation').map(result => result.id))
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
