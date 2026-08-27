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

    expect(html).toMatchInlineSnapshot(`
      "<div class="kawa-container kawa-container--info"><p class="kawa-container__title">Info</p>
      <p>Information.</p>
      </div>
      <div class="kawa-container kawa-container--tip"><p class="kawa-container__title">Tip</p>
      <p>A useful tip.</p>
      </div>
      <div class="kawa-container kawa-container--warning"><p class="kawa-container__title">Warning</p>
      <p>Take care.</p>
      </div>
      <div class="kawa-container kawa-container--danger"><p class="kawa-container__title">Danger</p>
      <p>Stop here.</p>
      </div>
      <details class="kawa-container kawa-container--details"><summary class="kawa-container__title">Details</summary>
      <p>Hidden details.</p>
      </details>
      "
    `)
  })

  it('renders inline Markdown in custom titles and nested content', () => {
    const markdown = createMarkdownExit({ html: true })
    installContainers(markdown)

    const html = markdown.render(`::: warning **Read carefully**
- First
- Second
:::
`)

    expect(html).toMatchInlineSnapshot(`
      "<div class="kawa-container kawa-container--warning"><p class="kawa-container__title"><strong>Read carefully</strong></p>
      <ul>
      <li>First</li>
      <li>Second</li>
      </ul>
      </div>
      "
    `)
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

    expect(html).toMatchInlineSnapshot(`
      "<p>::: raw
      Content
      :::</p>
      <blockquote>
      <p>[!NOTE]
      Content</p>
      </blockquote>
      "
    `)
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

    expect({
      chinese: markdown.render('::: tip\n内容\n:::', { path: '/guide' }),
      english: markdown.render('::: tip\nContent\n:::', { path: '/en/guide' }),
      globalOverride: markdown.render(
        '::: danger\nContent\n:::',
        { path: '/en/guide' },
      ),
    }).toMatchInlineSnapshot(`
      {
        "chinese": "<div class="kawa-container kawa-container--tip"><p class="kawa-container__title">提示</p>
      <p>内容</p>
      </div>
      ",
        "english": "<div class="kawa-container kawa-container--tip"><p class="kawa-container__title">Hint</p>
      <p>Content</p>
      </div>
      ",
        "globalOverride": "<div class="kawa-container kawa-container--danger"><p class="kawa-container__title">Risk</p>
      <p>Content</p>
      </div>
      ",
      }
    `)
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
    pageArtifact() {},
    vite() {},
    buildArtifacts() {},
  })

  if (!configHandler || !markdownHandler) {
    throw new Error('Expected container plugin to register config and markdown handlers.')
  }

  return {
    config: configHandler,
    markdown: markdownHandler,
  }
}
