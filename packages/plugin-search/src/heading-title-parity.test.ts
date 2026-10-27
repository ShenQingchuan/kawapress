import type { MarkdownExit } from 'markdown-exit'
import { mathjaxPlugin } from '@kawapress/plugin-mathjax'
import { beforeAll, describe, expect, it } from 'vitest'
// The parity test needs the repository's own compile path, which the public
// entries do not expose; the site build uses the very same functions.
import { createMarkdownCompiler, parseMarkdown } from '../../kawapress/src/compiler/markdown'
import { createPageSummaryReader } from '../../kawapress/src/compiler/page-summary'
import { createGeneratorPluginRunner } from '../../kawapress/src/plugin/generator-runner'
import { createSearchDocuments } from './search-index-plugin'

/**
 * Sources whose heading text reaches the title through a different number of
 * Markdown plugin: MathJax turns a formula into its own token while the readers
 * that skip page rendering see plain text.
 */
const SOURCES = [
  '# Energy $E=mc^2$ and `x`\n',
  '# Run `md.parse()` with *emphasis*\n',
  '# Read the [guide *text*](/guide/start)\n',
  '# Custom id {#custom-id}\n',
  '# Press <kbd>Ctrl</kbd> now\n',
  '# Ship :rocket: today\n',
  '# ![Android](/android.svg) setup\n',
  'Markdown *Extensions*\n===\n',
  '---\ntitle: Frontmatter title\n---\n# Unused heading\n',
]

let compiler: MarkdownExit

beforeAll(async () => {
  compiler = await createMarkdownCompiler({
    pluginRunner: await createGeneratorPluginRunner([mathjaxPlugin()]),
  })
})

describe('heading title parity', () => {
  it('reads the same page title while compiling, summarizing and indexing', async () => {
    const summaries = createPageSummaryReader()

    for (const [index, source] of SOURCES.entries()) {
      const route = `/guide/page-${index}`
      const { pageData } = await parseMarkdown(compiler, source, route)
      const [document] = createSearchDocuments(source, route)

      expect(summaries.read(source, `${route}.md`).title).toBe(pageData.title)
      expect(document?.title).toBe(pageData.title)
    }
  })

  it('reads the same heading title in the outline and in the search index', async () => {
    const source = '# Speed $v$\n\n## Energy $E=mc^2$ here\n\nBody text.\n'

    const { pageData } = await parseMarkdown(compiler, source, '/guide/math')
    const documents = createSearchDocuments(source, '/guide/math')

    expect(pageData.title).toBe('Speed $v$')
    expect(pageData.headers[0]?.children[0]?.title).toBe('Energy $E=mc^2$ here')
    expect(documents[1]?.title).toBe('Energy $E=mc^2$ here')
  })
})
