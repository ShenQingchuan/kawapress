import type { MarkdownExit } from 'markdown-exit'
import { installMathJax } from '@kawapress/plugin-mathjax'
import { attrs as attrsPlugin } from '@mdit/plugin-attrs'
import { createMarkdownExit, Token } from 'markdown-exit'
import anchorPlugin from 'markdown-it-anchor'
import { beforeAll, describe, expect, it } from 'vitest'
import { useMarkdownItPlugin } from '../compiler/markdown-it-compat'
import { resolveHeadingTitle } from './heading-title'

let md: MarkdownExit
let mdWithMathJax: MarkdownExit

beforeAll(async () => {
  md = createPageMarkdown()
  mdWithMathJax = createPageMarkdown()
  installMathJax(mdWithMathJax)
})

/** The same headings a site compiles: custom IDs and the heading permalink. */
function createPageMarkdown(): MarkdownExit {
  const markdown = createMarkdownExit({ html: true })
  useMarkdownItPlugin(markdown, attrsPlugin, {
    allowed: ['id'],
    rule: ['heading'],
  })
  useMarkdownItPlugin(markdown, anchorPlugin, {
    level: [1, 2, 3, 4, 5, 6],
    permalink: anchorPlugin.permalink.linkInsideHeader({
      class: 'header-anchor',
      placement: 'after',
      space: true,
      symbol: '#',
    }),
  })
  return markdown
}

function headingTitle(markdown: MarkdownExit, heading: string): string {
  const tokens = markdown.parse(`${heading}\n\n`, {})
  const inline = tokens.find(token => token.type === 'inline')
  if (!inline) {
    throw new Error(`Heading ${JSON.stringify(heading)} produced no inline token.`)
  }
  return resolveHeadingTitle(inline)
}

function headingSlug(markdown: MarkdownExit, heading: string): null | string {
  const tokens = markdown.parse(`${heading}\n\n`, {})
  return tokens.find(token => token.type === 'heading_open')?.attrGet('id') ?? null
}

describe('resolveHeadingTitle', () => {
  it('keeps plain text as written', () => {
    expect(headingTitle(md, '# Install KawaPress')).toBe('Install KawaPress')
  })

  it('drops emphasis, strong and strikethrough markup but keeps their text', () => {
    expect(headingTitle(md, '# A *em* **strong** ~~gone~~ word'))
      .toBe('A em strong gone word')
  })

  it('keeps the text of a link, including emphasis nested inside it', () => {
    expect(headingTitle(md, '# Read the [*guide* text](/guide) now'))
      .toBe('Read the guide text now')
  })

  it('keeps inline code without its backticks', () => {
    expect(headingTitle(md, '# Run `md.parse()` now')).toBe('Run md.parse() now')
    expect(headingTitle(md, '# [`markdown` link](/guide)')).toBe('markdown link')
  })

  it('removes a custom heading id and the heading permalink', () => {
    expect(headingTitle(md, '# Markdown Extensions {#markdown-extensions}'))
      .toBe('Markdown Extensions')
    expect(headingSlug(md, '# Markdown Extensions {#markdown-extensions}'))
      .toBe('markdown-extensions')
    expect(headingTitle(md, '# Generated permalink')).toBe('Generated permalink')
  })

  it('collapses runs of spaces and trims the result', () => {
    expect(headingTitle(md, '#   two  spaces   here   ')).toBe('two spaces here')
  })

  it('reads a setext heading', () => {
    expect(headingTitle(md, 'Install KawaPress\n===')).toBe('Install KawaPress')
  })

  it('keeps inline HTML as written', () => {
    expect(headingTitle(md, '# Press <kbd>Ctrl</kbd> to continue'))
      .toBe('Press <kbd>Ctrl</kbd> to continue')
  })

  it('keeps the alt text of an image without its markup', () => {
    expect(headingTitle(md, '# ![Android](/android.svg) setup')).toBe('Android setup')
  })

  it('keeps an inline formula as it is written in the source', () => {
    const heading = '# Energy $E=mc^2$ and `x`'
    const expected = 'Energy $E=mc^2$ and x'

    // Without MathJax the formula is plain text, with MathJax it is a token
    // whose content lost the dollar signs; the title must not care which.
    expect(headingTitle(md, heading)).toBe(expected)
    expect(headingTitle(mdWithMathJax, heading)).toBe(expected)
  })

  it('does not let the heading slug follow the title', () => {
    expect(headingSlug(mdWithMathJax, '# Energy $E=mc^2$ and `x`')).toBe('energy-and-x')
  })

  it('keeps an emoji shortcode as written', () => {
    expect(headingTitle(md, '# Ship :rocket: today')).toBe('Ship :rocket: today')

    // A token written by an emoji plugin carries either the whole shortcode or
    // its name with `:` on both sides; the title stays the same text.
    const shortcode = new Token('emoji', '', 0)
    shortcode.content = ':rocket:'
    shortcode.markup = ''
    const name = new Token('emoji', '', 0)
    name.content = 'rocket'
    name.markup = ':'

    expect(resolveHeadingTitle(inline(['Ship ', shortcode, ' today'])))
      .toBe('Ship :rocket: today')
    expect(resolveHeadingTitle(inline(['Ship ', name, ' today'])))
      .toBe('Ship :rocket: today')
  })

  it('keeps the markup of a token type it has never seen', () => {
    const highlightOpen = new Token('mark_open', 'mark', 1)
    highlightOpen.markup = '=='
    const highlightClose = new Token('mark_close', 'mark', -1)
    highlightClose.markup = '=='
    const text = new Token('text', '', 0)
    text.content = 'highlighted'
    const unknown = new Token('kbd_inline', '', 0)
    unknown.content = 'Ctrl'

    expect(resolveHeadingTitle(inline([highlightOpen, text, highlightClose, ' ', unknown])))
      .toBe('==highlighted== Ctrl')
  })

  it('returns an empty title for a heading without text', () => {
    expect(resolveHeadingTitle(inline([]))).toBe('')
  })
})

function inline(children: Array<string | Token>): Token {
  const token = new Token('inline', '', 0)
  token.children = children.map(child => (typeof child === 'string' ? textToken(child) : child))
  return token
}

function textToken(content: string): Token {
  const token = new Token('text', '', 0)
  token.content = content
  return token
}
