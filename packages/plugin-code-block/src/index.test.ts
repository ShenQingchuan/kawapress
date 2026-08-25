import type { GeneratorPluginAPI, SiteConfig } from 'kawapress'
import type { MarkdownExit } from 'markdown-exit'
import { createMarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import {
  codeBlockPlugin,
  installCodeBlocks,
} from './index'

describe('code block plugin', () => {
  it('renders a complete code block with language, copy, and line numbers', () => {
    const markdown = createMarkdownExit({ html: true })
    installCodeBlocks(markdown)

    expect(markdown.render(`\`\`\`ts:line-numbers=3
const first = 1
const second = 2
\`\`\`
`)).toMatchInlineSnapshot(`
  "<div class="kawa-code-block language-ts kawa-code-block--line-numbers" data-language="ts" style="--kawa-code-block-line-number-digits:1"><span class="kawa-code-block__language">TypeScript</span><button class="kawa-code-block__copy" type="button" aria-label="Copy code" title="Copy code" data-copy-label="Copy code" data-copied-label="Copied"><span class="kawa-code-block__copy-status" aria-live="polite"></span></button><div class="kawa-code-block__body"><pre><code class="language-ts">const first = 1
  const second = 2
  </code></pre>
  <div class="kawa-code-block__line-numbers" aria-hidden="true"><span class="kawa-code-block__line-number">3</span><span class="kawa-code-block__line-number">4</span></div></div></div>
  "
`)
  })

  it('keeps other fence metadata while applying line-number overrides', () => {
    const markdown = createMarkdownExit({ html: true })
    const highlighted: { attrs: string, language: string }[] = []
    markdown.options.highlight = (source, language, attrs) => {
      highlighted.push({ attrs, language })
      return `<pre class="shiki"><code>${markdown.utils.escapeHtml(source.trimEnd())}</code></pre>`
    }
    installCodeBlocks(markdown, { lineNumbers: true })

    const html = markdown.render(`\`\`\`ts:no-line-numbers twoslash title="Using :line-numbers"  [npm]
const value = 1
\`\`\`
`)

    expect(highlighted).toEqual([{
      attrs: 'twoslash title="Using :line-numbers"  [npm]',
      language: 'ts',
    }])
    expect(html).toMatchInlineSnapshot(`
      "<div class="kawa-code-block language-ts" data-language="ts"><span class="kawa-code-block__language">TypeScript</span><button class="kawa-code-block__copy" type="button" aria-label="Copy code" title="Copy code" data-copy-label="Copy code" data-copied-label="Copied"><span class="kawa-code-block__copy-status" aria-live="polite"></span></button><div class="kawa-code-block__body"><pre class="shiki"><code>const value = 1</code></pre>
      </div></div>
      "
    `)
  })

  it('handles inherited language names, empty code, and wide line numbers', () => {
    const markdown = createMarkdownExit({ html: true })
    installCodeBlocks(markdown)

    expect(markdown.render('```constructor:line-numbers=100000\n```'))
      .toMatchInlineSnapshot(`
        "<div class="kawa-code-block language-constructor kawa-code-block--line-numbers" data-language="constructor" style="--kawa-code-block-line-number-digits:6"><span class="kawa-code-block__language">constructor</span><button class="kawa-code-block__copy" type="button" aria-label="Copy code" title="Copy code" data-copy-label="Copy code" data-copied-label="Copied"><span class="kawa-code-block__copy-status" aria-live="polite"></span></button><div class="kawa-code-block__body"><pre><code class="language-constructor"></code></pre>
        <div class="kawa-code-block__line-numbers" aria-hidden="true"><span class="kawa-code-block__line-number">100000</span></div></div></div>
        "
      `)
  })

  it('preserves an asynchronous fence renderer', async () => {
    const markdown = createMarkdownExit({ html: true })
    markdown.renderer.rules.fence = async () => (
      '<pre class="async"><code>Async output</code></pre>'
    )
    installCodeBlocks(markdown)

    const html = await markdown.renderAsync('```js\nsource\n```')
    expect(html).toMatchInlineSnapshot(`
      "<div class="kawa-code-block language-js" data-language="js"><span class="kawa-code-block__language">JavaScript</span><button class="kawa-code-block__copy" type="button" aria-label="Copy code" title="Copy code" data-copy-label="Copy code" data-copied-label="Copied"><span class="kawa-code-block__copy-status" aria-live="polite"></span></button><div class="kawa-code-block__body"><pre class="async"><code>Async output</code></pre></div></div>
      "
    `)
  })

  it('localizes copy feedback and accepts language label overrides', async () => {
    const plugin = codeBlockPlugin({
      languageLabels: {
        ts: '<Typed & Safe>',
      },
      localeCopyLabels: {
        en: {
          copy: 'Copy "snippet"',
          copied: 'It\'s copied',
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
      chinese: markdown.render('```ts\nconst n = 1\n```', { path: '/guide' }),
      english: markdown.render('```ts\nconst n = 1\n```', { path: '/en/guide' }),
    }).toMatchInlineSnapshot(`
      {
        "chinese": "<div class="kawa-code-block language-ts" data-language="ts"><span class="kawa-code-block__language">&lt;Typed &amp; Safe&gt;</span><button class="kawa-code-block__copy" type="button" aria-label="复制代码" title="复制代码" data-copy-label="复制代码" data-copied-label="已复制"><span class="kawa-code-block__copy-status" aria-live="polite"></span></button><div class="kawa-code-block__body"><pre><code class="language-ts">const n = 1
      </code></pre>
      </div></div>
      ",
        "english": "<div class="kawa-code-block language-ts" data-language="ts"><span class="kawa-code-block__language">&lt;Typed &amp; Safe&gt;</span><button class="kawa-code-block__copy" type="button" aria-label="Copy &quot;snippet&quot;" title="Copy &quot;snippet&quot;" data-copy-label="Copy &quot;snippet&quot;" data-copied-label="It&#39;s copied"><span class="kawa-code-block__copy-status" aria-live="polite"></span></button><div class="kawa-code-block__body"><pre><code class="language-ts">const n = 1
      </code></pre>
      </div></div>
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
    vite() {},
  })

  if (!configHandler || !markdownHandler) {
    throw new Error('Expected code block plugin to register config and markdown handlers.')
  }
  return {
    config: configHandler,
    markdown: markdownHandler,
  }
}
