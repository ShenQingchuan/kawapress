import type { GeneratorPluginAPI, SiteConfig } from 'kawapress'
import type { MarkdownExit } from 'markdown-exit'
import { createMarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import {
  containerPlugin,
  installContainers,
} from './index'

describe('container plugin', () => {
  it('renders the supported semantic container structures', () => {
    const markdown = createMarkdownExit({ html: true })
    installContainers(markdown)

    const html = markdown.render(`::: info
Information.
:::

::: tip
A useful tip.
:::

::: warning
Take care.
:::

::: danger
Stop here.
:::

::: details
Hidden details.
:::
`)

    expect(html).toContain('<div class="kawa-container kawa-container--info"><p class="kawa-container__title">Info</p>')
    expect(html).toContain('<div class="kawa-container kawa-container--tip"><p class="kawa-container__title">Tip</p>')
    expect(html).toContain('<div class="kawa-container kawa-container--warning"><p class="kawa-container__title">Warning</p>')
    expect(html).toContain('<div class="kawa-container kawa-container--danger"><p class="kawa-container__title">Danger</p>')
    expect(html).toContain('<details class="kawa-container kawa-container--details"><summary class="kawa-container__title">Details</summary>')
    expect(html).toContain('<p>Hidden details.</p>')
    expect(html).toContain('</details>')
  })

  it('renders inline Markdown in custom titles and nested content', () => {
    const markdown = createMarkdownExit({ html: true })
    installContainers(markdown)

    const html = markdown.render(`::: warning **Read carefully**
- First
- Second
:::
`)

    expect(html).toContain('<p class="kawa-container__title"><strong>Read carefully</strong></p>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>First</li>')
  })

  it('does not claim raw or GitHub alert syntax', () => {
    const markdown = createMarkdownExit({ html: true })
    installContainers(markdown)

    const html = markdown.render(`::: raw
Content
:::

> [!NOTE]
> Content
`)

    expect(html).not.toContain('kawa-container')
    expect(html).toContain('[!NOTE]')
  })

  it('localizes default titles from the page locale and accepts overrides', async () => {
    const plugin = containerPlugin({
      labels: {
        danger: 'Risk',
      },
      localeLabels: {
        en: {
          tip: 'Hint',
        },
      },
    })
    const handlers = await registerPlugin(plugin.setup)
    await handlers.config({
      locales: {
        root: { label: '简体中文', lang: 'zh-CN' },
        en: { label: 'English', lang: 'en' },
      },
    })
    const markdown = createMarkdownExit({ html: true })
    await handlers.markdown(markdown)

    expect(markdown.render('::: tip\n内容\n:::', { path: '/guide' }))
      .toContain('class="kawa-container__title">提示</p>')
    expect(markdown.render('::: tip\nContent\n:::', { path: '/en/guide' }))
      .toContain('class="kawa-container__title">Hint</p>')
    expect(markdown.render('::: danger\nContent\n:::', { path: '/en/guide' }))
      .toContain('class="kawa-container__title">Risk</p>')
  })
})

type Setup = (api: GeneratorPluginAPI) => void | Promise<void>

async function registerPlugin(setup: Setup): Promise<{
  config: (config: SiteConfig) => void | Promise<void>
  markdown: (markdown: MarkdownExit) => void | Promise<void>
}> {
  let configHandler: ((config: SiteConfig) => void | Promise<void>) | undefined
  let markdownHandler: ((markdown: MarkdownExit) => void | Promise<void>) | undefined

  await setup({
    config(handler) {
      configHandler = handler
    },
    markdown(handler) {
      markdownHandler = handler
    },
    pageData() {},
    vite() {},
  })

  if (!configHandler || !markdownHandler) {
    throw new Error('Expected container plugin to register config and markdown handlers.')
  }

  return {
    config: configHandler,
    markdown: markdownHandler,
  }
}
