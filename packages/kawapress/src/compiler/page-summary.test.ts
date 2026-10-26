import { describe, expect, it } from 'vitest'
import { createMarkdownCompiler, parseMarkdown } from './markdown'
import { createPageSummaryReader } from './page-summary'

function summarize(source: string) {
  return createPageSummaryReader().read(source, '/guide/page.md')
}

describe('page summary', () => {
  it('prefers the frontmatter title over the first heading', () => {
    const summary = summarize('---\ntitle: Custom Title\n---\n# Heading\n')

    expect(summary.title).toBe('Custom Title')
  })

  it('falls back to the first level-1 heading', () => {
    const summary = summarize('# First\n\n## Second\n\n# Third\n')

    expect(summary.title).toBe('First')
  })

  it('reduces inline markup of the heading to plain text', () => {
    const summary = summarize(
      '# Run `md.parse()` with *emphasis* and a [link](/guide)\n',
    )

    expect(summary.title).toBe('Run md.parse() with emphasis and a link')
  })

  it('removes a custom heading id', () => {
    const summary = summarize('# Markdown Extensions {#markdown-extensions}\n')

    expect(summary.title).toBe('Markdown Extensions')
  })

  it('returns an empty title when the page has neither a title nor a heading', () => {
    const summary = summarize('Just a paragraph.\n\n## Sub heading\n')

    expect(summary.title).toBe('')
  })

  it('reads JSON frontmatter', () => {
    const summary = summarize('{"title":"JSON Title"}\n\n# Heading\n')

    expect(summary.title).toBe('JSON Title')
  })

  it('does not treat a hash inside a fenced code block as a heading', () => {
    const summary = summarize('```md\n# Not a heading\n```\n\n# Real heading\n')

    expect(summary.title).toBe('Real heading')
  })

  it('ignores a heading nested inside a quote', () => {
    const summary = summarize('> # Quoted\n\n## Sub heading\n')

    expect(summary.title).toBe('')
  })

  it('keeps the layout only when frontmatter defines a string', () => {
    expect(summarize('---\nlayout: home\n---\n').layout).toBe('home')
    expect(summarize('---\nlayout: false\n---\n').layout).toBeUndefined()
    expect(summarize('# Heading\n')).toEqual({ title: 'Heading' })
  })

  it('caches a summary until the file content changes', () => {
    const reader = createPageSummaryReader()

    expect(reader.read('# Before\n', '/guide/page.md').title).toBe('Before')
    expect(reader.read('# After\n', '/guide/page.md').title).toBe('After')
    expect(reader.read('# After\n', '/guide/page.md').title).toBe('After')
  })

  it('agrees with the full Markdown pipeline on every title', async () => {
    const sources = [
      '---\ntitle: Frontmatter\n---\n# Heading\n',
      '# Heading only\n',
      'No title and no heading.\n',
      '# Run `code` and *emphasis*\n',
      '# Link to [the guide](/guide/start)\n',
      '# Custom id {#custom-id}\n',
      '{"title":"JSON frontmatter"}\n',
      '```md\n# Only in a fence\n```\n',
      '> # Quoted heading\n\n## Sub heading\n',
      '# Heading with <span>html</span>\n',
      '---\ntitle: Trailing hash\nlayout: page\n---\n# Not used, has # hash\n',
    ]
    const md = await createMarkdownCompiler()

    const summaries = await Promise.all(sources.map(async (source, index) => {
      const { pageData } = await parseMarkdown(md, source, `/page-${index}`)
      return { summary: createPageSummaryReader().read(source, `/page-${index}.md`), pageData }
    }))

    for (const { summary, pageData } of summaries) {
      expect(summary.title).toBe(pageData.title)
    }
  })
})
