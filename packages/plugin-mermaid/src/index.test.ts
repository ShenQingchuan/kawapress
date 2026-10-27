import type { GeneratorPluginAPI, SiteConfig } from 'kawapress'
import type { MarkdownExit } from 'markdown-exit'
import { createMarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import { mermaidPlugin } from './index'

const LOCALES = {
  root: { label: '简体中文', lang: 'zh-CN' },
  en: { label: 'English', lang: 'en' },
}

const FENCE = '```mermaid\nflowchart LR\n  A --> B\n```\n'

describe('mermaid plugin', () => {
  it('resolves labels per locale and accepts overrides', async () => {
    const handlers = await register(mermaidPlugin({
      labels: { code: 'Source' },
      localeLabels: { en: { split: 'Both' } },
    }))
    await handlers.config({ locales: LOCALES })
    const markdown = createMarkdownExit({ html: true })
    await handlers.markdown(markdown)

    const chinese = labelsOf(markdown.render(FENCE, { path: '/guide/chart' }))
    const english = labelsOf(markdown.render(FENCE, { path: '/en/guide/chart' }))

    expect(chinese).toMatchObject({ diagram: '图像', code: 'Source', split: '并排' })
    expect(english).toMatchObject({ diagram: 'Diagram', code: 'Source', split: 'Both' })
  })

  it('imports the page component only into pages that have a diagram', async () => {
    const handlers = await register(mermaidPlugin())
    const markdown = createMarkdownExit({ html: true })
    await handlers.markdown(markdown)

    const withDiagram: { pageComponents?: { name: string }[] } = { }
    const withoutDiagram: { pageComponents?: { name: string }[] } = { }
    markdown.render(FENCE, withDiagram)
    markdown.render('```ts\nconst a = 1\n```\n', withoutDiagram)

    expect(withDiagram.pageComponents?.map(component => component.name)).toEqual(['KawaMermaid'])
    expect(withoutDiagram.pageComponents).toBeUndefined()
  })

  it('lets the plugin option pick the starting view', async () => {
    const handlers = await register(mermaidPlugin({ defaultView: 'split' }))
    const markdown = createMarkdownExit({ html: true })
    await handlers.markdown(markdown)

    expect(markdown.render(FENCE)).toContain('view="split"')
    expect(markdown.render(FENCE.replace('mermaid', 'mermaid code'))).toContain('view="code"')
  })
})

function labelsOf(html: string): Record<string, string> {
  const match = /:labels='([^']+)'/.exec(html)
  if (!match) {
    throw new Error('Expected the diagram to carry its labels.')
  }
  const json = match[1]
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', '\'')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
  return JSON.parse(json)
}

interface Handlers {
  config: (config: SiteConfig) => void | Promise<void>
  markdown: (markdown: MarkdownExit) => void | Promise<void>
}

async function register(plugin: { setup: (api: GeneratorPluginAPI) => void | Promise<void> }): Promise<Handlers> {
  let config: Handlers['config'] = () => {}
  let markdown: Handlers['markdown'] | undefined

  await plugin.setup({
    config(handler) {
      config = handler
    },
    markdown(handler) {
      markdown = handler
    },
    pageData() {},
    pageArtifact() {},
    vite() {},
    buildArtifacts() {},
  })

  if (!markdown) {
    throw new Error('Expected the mermaid plugin to register a markdown handler.')
  }
  return { config, markdown }
}
