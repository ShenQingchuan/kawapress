import type { GeneratorPluginAPI, SiteConfig } from 'kawapress'
import type { MarkdownExit } from 'markdown-exit'
import type { Plugin, UserConfig } from 'vite'
import { createMarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import { imageZoomPlugin, installImageZoom } from './index'
import { IMAGE_ZOOM_OPTIONS_MODULE_ID } from './options-module'

const LOCALES = {
  root: { label: '简体中文', lang: 'zh-CN' },
  en: { label: 'English', lang: 'en' },
}

describe('image zoom markdown rule', () => {
  it('marks a Markdown image as a zoomable button', () => {
    const markdown = createMarkdownExit({ html: true })
    installImageZoom(markdown)

    expect(markdown.render('# Title\n\n![KawaPress logo](/kawapress-logo.png)\n'))
      .toMatchInlineSnapshot(`
        "<h1>Title</h1>
        <p><img src="/kawapress-logo.png" alt="KawaPress logo" data-kawa-zoom="" role="button" tabindex="0" aria-label="Zoom image: KawaPress logo"></p>
        "
      `)
  })

  it('strips the opt-out hash and leaves that image alone', () => {
    const markdown = createMarkdownExit({ html: true })
    installImageZoom(markdown)

    expect({
      optOut: markdown.render('![Diagram](./diagram.png#no-zoom)'),
      otherHash: markdown.render('![Diagram](./diagram.png#figure-1)'),
      query: markdown.render('![Diagram](./diagram.png?v=2#no-zoom)'),
    }).toMatchInlineSnapshot(`
      {
        "optOut": "<p><img src="./diagram.png" alt="Diagram"></p>
      ",
        "otherHash": "<p><img src="./diagram.png#figure-1" alt="Diagram" data-kawa-zoom="" role="button" tabindex="0" aria-label="Zoom image: Diagram"></p>
      ",
        "query": "<p><img src="./diagram.png?v=2" alt="Diagram"></p>
      ",
      }
    `)
  })

  it('strips the opt-out hash even when the page opts out entirely', () => {
    const markdown = createMarkdownExit({ html: true })
    installImageZoom(markdown)

    expect(markdown.render(
      '![Diagram](./diagram.png#no-zoom)',
      createEnv({ imageZoom: false }),
    )).toMatchInlineSnapshot(`
      "<p><img src="./diagram.png" alt="Diagram"></p>
      "
    `)
  })

  it('leaves every image of a page that opts out in frontmatter', () => {
    const markdown = createMarkdownExit({ html: true })
    installImageZoom(markdown)

    expect(markdown.render(
      '![Diagram](./diagram.png)',
      createEnv({ imageZoom: false }),
    )).toMatchInlineSnapshot(`
      "<p><img src="./diagram.png" alt="Diagram"></p>
      "
    `)
  })

  it('never touches raw HTML images', () => {
    const markdown = createMarkdownExit({ html: true })
    installImageZoom(markdown)

    expect(markdown.render('<img src="/raw.png" alt="Raw">')).toMatchInlineSnapshot(`"<img src="/raw.png" alt="Raw">"`)
  })

  it('keeps the displayed alt text and the accessible name in sync', () => {
    const markdown = createMarkdownExit({ html: true })
    installImageZoom(markdown)

    expect(markdown.render('![*Emphasized* diagram](/diagram.png)'))
      .toMatchInlineSnapshot(`
        "<p><img src="/diagram.png" alt="Emphasized diagram" data-kawa-zoom="" role="button" tabindex="0" aria-label="Zoom image: Emphasized diagram"></p>
        "
      `)
  })

  it('resolves labels per locale and accepts overrides', async () => {
    const plugin = imageZoomPlugin({
      labels: { dialog: 'Enlarged image' },
      localeLabels: { en: { zoom: 'Open {alt} larger' } },
    })
    const handlers = await registerPlugin(plugin.setup)
    await handlers.config({ locales: LOCALES })

    const markdown = createMarkdownExit({ html: true })
    await handlers.markdown(markdown)

    expect({
      chinese: markdown.render('![架构图](/diagram.png)', { path: '/guide/diagram' }),
      english: markdown.render('![Diagram](/diagram.png)', { path: '/en/guide/diagram' }),
    }).toMatchInlineSnapshot(`
      {
        "chinese": "<p><img src="/diagram.png" alt="架构图" data-kawa-zoom="" role="button" tabindex="0" aria-label="放大图片：架构图"></p>
      ",
        "english": "<p><img src="/diagram.png" alt="Diagram" data-kawa-zoom="" role="button" tabindex="0" aria-label="Open Diagram larger"></p>
      ",
      }
    `)
  })

  it('hands the runtime options to the browser as JSON', async () => {
    const plugin = imageZoomPlugin({ localeLabels: { en: { dialog: 'Zoomed' } } })
    const handlers = await registerPlugin(plugin.setup)
    await handlers.config({ locales: LOCALES })

    const config: UserConfig = {}
    await handlers.vite(config)
    const optionsPlugin = config.plugins?.at(-1) as Plugin
    const module = await loadVirtualModule(optionsPlugin)

    expect(JSON.parse(module.slice(module.indexOf('=') + 1))).toEqual({
      labels: {},
      localeLabels: { en: { dialog: 'Zoomed' } },
      localeLanguages: { en: 'en', root: 'zh-CN' },
    })
  })
})

function createEnv(
  frontmatter: Record<string, unknown>,
): Parameters<MarkdownExit['render']>[1] {
  return { frontmatter, path: '/guide/diagram' }
}

type Setup = (api: GeneratorPluginAPI) => void | Promise<void>

interface PluginHandlers {
  config: (config: SiteConfig) => void | Promise<void>
  markdown: (markdown: MarkdownExit) => void | Promise<void>
  vite: (config: UserConfig) => void | Promise<void>
}

async function registerPlugin(setup: Setup): Promise<PluginHandlers> {
  let config: PluginHandlers['config'] | undefined
  let markdown: PluginHandlers['markdown'] | undefined
  let vite: PluginHandlers['vite'] | undefined

  await setup({
    config(handler) {
      config = handler
    },
    markdown(handler) {
      markdown = handler
    },
    pageData() {},
    pageArtifact() {},
    vite(handler) {
      vite = handler
    },
    buildArtifacts() {},
  })

  if (!config || !markdown || !vite) {
    throw new Error('Expected the image zoom plugin to register config, markdown, and vite handlers.')
  }
  return { config, markdown, vite }
}

type VirtualModuleHook = (id: string) => unknown

async function loadVirtualModule(plugin: Plugin): Promise<string> {
  const resolveId = plugin.resolveId as unknown as VirtualModuleHook | undefined
  const load = plugin.load as unknown as VirtualModuleHook | undefined
  const resolved = await resolveId?.(IMAGE_ZOOM_OPTIONS_MODULE_ID)
  if (typeof resolved !== 'string' || !load) {
    throw new Error('Expected the image zoom plugin to resolve its virtual module.')
  }
  const module = await load(resolved)
  if (typeof module !== 'string') {
    throw new TypeError('Expected the image zoom virtual module to be a string.')
  }
  return module
}
