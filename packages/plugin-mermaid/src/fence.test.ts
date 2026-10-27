import { createMarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import { installMermaid, parseMermaidInfo } from './fence'
import { ENGLISH_MERMAID_LABELS } from './labels'

function createMarkdown(onDiagram?: () => void) {
  const markdown = createMarkdownExit({ html: true })
  installMermaid(markdown, { resolveLabels: () => ENGLISH_MERMAID_LABELS, onDiagram })
  return markdown
}

describe('parseMermaidInfo', () => {
  it('recognizes only mermaid fences', () => {
    expect(parseMermaidInfo('ts')).toBeUndefined()
    expect(parseMermaidInfo('mermaidx')).toBeUndefined()
    expect(parseMermaidInfo('mermaid')).toEqual({ view: undefined })
  })

  it('reads the starting view and ignores other words', () => {
    expect(parseMermaidInfo('mermaid split')).toEqual({ view: 'split' })
    expect(parseMermaidInfo('Mermaid {1,2} code')).toEqual({ view: 'code' })
    expect(parseMermaidInfo('mermaid [Flow]')).toEqual({ view: undefined })
  })
})

describe('mermaid fence', () => {
  it('draws the diagram at build time and keeps the source for the code view', () => {
    const html = createMarkdown().render('```mermaid\nflowchart LR\n  A --> B\n```\n')

    expect(html).toContain('<KawaMermaid')
    expect(html).toContain('view="diagram"')
    expect(html).toContain('<template #diagram>\n<div v-pre><svg')
    expect(html).toContain('<template #code>')
    expect(html).toContain(':source=\'"flowchart LR\\n  A --&gt; B\\n"\'')
  })

  it('starts in the view named by the fence', () => {
    const html = createMarkdown().render('```mermaid split\nflowchart LR\n  A --> B\n```\n')
    expect(html).toContain('view="split"')
  })

  it('reports a diagram it cannot draw instead of failing the build', () => {
    const html = createMarkdown().render('```mermaid\nflowchart LR\n  A[Hi {{x}}] --> B\n```\n')

    expect(html).toContain(':error=')
    expect(html).not.toContain('<template #diagram>')
    expect(html).toContain('<template #code>')
  })

  it('declares the page component once per rendered diagram', () => {
    let count = 0
    const markdown = createMarkdown(() => count++)
    markdown.render('```mermaid\nflowchart LR\n  A --> B\n```\n\n```mermaid\npie\n  "a": 1\n```\n')
    expect(count).toBe(2)
  })

  it('gives every diagram on a page its own id prefix', () => {
    // Ids only exist when a diagram names itself for assistive technology.
    const diagram = '```mermaid\nflowchart LR\n  accTitle: Flow\n  A --> B\n```\n'
    const html = createMarkdown().render(`${diagram}\n${diagram}`)
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(match => match[1])

    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
  })

  it('leaves other languages to the previous renderer', () => {
    const html = createMarkdown().render('```ts\nconst a = 1\n```\n')
    expect(html).toContain('<pre><code class="language-ts">')
    expect(html).not.toContain('KawaMermaid')
  })
})
