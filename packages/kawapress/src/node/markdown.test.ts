import type { MarkdownExit } from 'markdown-exit'
import { shikiPlugin } from '@kawapress/plugin-shiki'
import { nagi } from '@kawapress/preset-nagi'
import { beforeAll, describe, expect, it } from 'vitest'
import { definePlugin } from '../api/plugin'
import { compileMarkdownToVue, createMarkdownCompiler } from './markdown'
import { createGeneratorPluginRunner } from './plugin-runner'

let md: MarkdownExit
let mdWithBase: MarkdownExit
let mdWithShiki: MarkdownExit
let mdWithCallouts: MarkdownExit
beforeAll(async () => {
  md = await createMarkdownCompiler()
  mdWithBase = await createMarkdownCompiler({ base: '/kawapress/' })
  mdWithShiki = await createMarkdownCompiler({
    pluginRunner: await createGeneratorPluginRunner([shikiPlugin()]),
  })
  const calloutConfig = nagi({
    locales: {
      root: { label: '简体中文', lang: 'zh-CN' },
      en: { label: 'English', lang: 'en' },
    },
    plugins: [definePlugin({
      name: 'test:inline-render-env',
      setup(api) {
        api.markdown((markdown) => {
          markdown.renderer.rules.em_open = (_tokens, _index, _options, env) => (
            `<em data-page-path="${markdown.utils.escapeHtml(env.path ?? '')}">`
          )
        })
      },
    })],
  })
  const calloutRunner = await createGeneratorPluginRunner(
    calloutConfig.plugins ?? [],
  )
  await calloutRunner.runConfig(calloutConfig)
  mdWithCallouts = await createMarkdownCompiler({
    pluginRunner: calloutRunner,
  })
})

describe('compileMarkdownToVue', () => {
  it('prefers frontmatter title over first h1', async () => {
    const { pageData } = await compileMarkdownToVue(
      md,
      '---\ntitle: Custom Title\n---\n\n# Hello\n',
      '/index',
    )
    expect(pageData.title).toBe('Custom Title')
  })

  it('falls back to first h1 when frontmatter has no title', async () => {
    const { code, pageData } = await compileMarkdownToVue(
      md,
      '# Hello World\n',
      '/index',
    )
    expect(pageData.title).toBe('Hello World')
    expect(code).toContain('<h1 id="hello-world"')
    expect(code).toContain('class="header-anchor" href="#hello-world"')
    expect(pageData.headers[0]).toMatchObject({
      level: 1,
      slug: 'hello-world',
    })
  })

  it('keeps custom heading anchors in rendered HTML and page data', async () => {
    const { code, pageData } = await compileMarkdownToVue(
      md,
      '## **配置指南** {#configuration}\n',
      '/guide/configuration',
    )

    expect(code).toContain('<h2 id="configuration"')
    expect(code).toContain('class="header-anchor" href="#configuration"')
    expect(code).not.toContain('{#configuration}')
    expect(pageData.headers[0]).toMatchObject({
      level: 2,
      title: '配置指南',
      slug: 'configuration',
      link: '#configuration',
    })
  })

  it('only accepts id from heading attribute syntax', async () => {
    const { code } = await compileMarkdownToVue(
      md,
      '## Safe {#safe .unsafe style="color:red" onclick="alert(1)"}\n',
      '/safe-heading-attributes',
    )

    expect(code).toContain('<h2 id="safe"')
    expect(code).not.toContain('class="unsafe"')
    expect(code).not.toContain('style="color:red"')
    expect(code).not.toContain('onclick=')
  })

  it('deduplicates automatic anchors and rejects collisions with explicit ids', async () => {
    const automatic = await compileMarkdownToVue(
      md,
      '## Shared\n\n## Shared\n',
      '/automatic-anchors',
    )
    expect(automatic.pageData.headers.map(header => header.slug))
      .toEqual(['shared', 'shared-1'])

    await expect(compileMarkdownToVue(
      md,
      '## Shared\n\n## Custom {#shared}\n',
      '/mixed-anchor-collision',
    )).rejects.toThrow('User defined `id` attribute `shared` is not unique')
  })

  it('rejects duplicate custom heading anchors', async () => {
    await expect(compileMarkdownToVue(
      md,
      '## One {#shared}\n\n## Two {#shared}\n',
      '/duplicate-anchors',
    )).rejects.toThrow('User defined `id` attribute `shared` is not unique')
  })

  it('keeps headers and locale context through async callout rendering', async () => {
    const { code, pageData } = await compileMarkdownToVue(
      mdWithCallouts,
      `# 页面

## 开始

::: tip *[文档][docs]*
容器正文。
:::

> [!IMPORTANT]
> 警报正文。

## 结束

[docs]: /guide
`,
      '/guide/callouts',
    )

    expect({
      headers: pageData.headers,
      template: code.slice(0, code.indexOf('</template>') + '</template>'.length),
    }).toMatchInlineSnapshot(`
      {
        "headers": [
          {
            "children": [
              {
                "children": [],
                "level": 2,
                "link": "#%E5%BC%80%E5%A7%8B",
                "slug": "%E5%BC%80%E5%A7%8B",
                "title": "开始",
              },
              {
                "children": [],
                "level": 2,
                "link": "#%E7%BB%93%E6%9D%9F",
                "slug": "%E7%BB%93%E6%9D%9F",
                "title": "结束",
              },
            ],
            "level": 1,
            "link": "#%E9%A1%B5%E9%9D%A2",
            "slug": "%E9%A1%B5%E9%9D%A2",
            "title": "页面",
          },
        ],
        "template": "<template><h1 id="%E9%A1%B5%E9%9D%A2" tabindex="-1">页面 <a class="header-anchor" href="#%E9%A1%B5%E9%9D%A2">#</a></h1>
      <h2 id="%E5%BC%80%E5%A7%8B" tabindex="-1">开始 <a class="header-anchor" href="#%E5%BC%80%E5%A7%8B">#</a></h2>
      <div class="kawa-container kawa-container--tip"><p class="kawa-container__title"><em data-page-path="/guide/callouts"><a href="/guide">文档</a></em></p>
      <p>容器正文。</p>
      </div>
      <div class="kawa-alert kawa-alert--important">
      <p class="kawa-alert__title">重要</p>
      <p>警报正文。</p>
      </div>
      <h2 id="%E7%BB%93%E6%9D%9F" tabindex="-1">结束 <a class="header-anchor" href="#%E7%BB%93%E6%9D%9F">#</a></h2>
      </template>",
      }
    `)
  })

  it('wires code block UI around standalone and grouped Shiki output', async () => {
    const { code } = await compileMarkdownToVue(
      mdWithCallouts,
      `# 代码

\`\`\`ts:line-numbers=8
const first = 1
const second = 2

\`\`\`

::: code-group
\`\`\`sh [pnpm]
pnpm add kawapress
\`\`\`
:::
`,
      '/guide/code',
    )

    expect(code).toContain('class="kawa-code-block language-ts kawa-code-block--line-numbers"')
    expect(code).toContain('aria-label="复制代码"')
    expect(code).toContain('class="kawa-code-block__line-number">8</span>')
    expect(code).toContain('class="kawa-code-block__line-number">9</span>')
    expect(code).toContain('class="kawa-code-block__line-number">10</span>')
    const standalone = code.slice(
      code.indexOf('<div class="kawa-code-block'),
      code.indexOf('<KawaCodeGroup'),
    )
    expect(standalone.match(/class="line"/g)).toHaveLength(3)
    expect(code).toContain('<template #panel-0>\n<div class="kawa-code-block language-sh"')
    expect(code).toContain('<pre class="shiki')
  })

  it('keeps line numbers aligned when annotations remove control lines', async () => {
    const { code } = await compileMarkdownToVue(
      mdWithCallouts,
      `\`\`\`ts:line-numbers=7
// [!code focus]
const focused = true
\`\`\`
`,
      '/guide/annotated-lines',
    )

    expect(code.match(/class="kawa-code-block__line-number"/g)).toHaveLength(1)
    expect(code).toContain('class="kawa-code-block__line-number">7</span>')
    expect(code).toContain('class="line has-focus"')
    expect(code).toContain('data-kawa-line-count="1"')
  })

  it('configures the built-in code block plugin through nagi once', async () => {
    const config = nagi({
      codeBlock: {
        lineNumbers: true,
      },
    })
    const runner = await createGeneratorPluginRunner(config.plugins ?? [])
    await runner.runConfig(config)
    const compiler = await createMarkdownCompiler({ pluginRunner: runner })
    const { code } = await compileMarkdownToVue(
      compiler,
      '```js\nconst value = 1\n```\n',
      '/code-defaults',
    )

    expect(code.match(/class="kawa-code-block language-js/g)).toHaveLength(1)
    expect(code).toContain('kawa-code-block--line-numbers')
    expect(code).toContain('class="kawa-code-block__line-number">1</span>')
    expect('codeBlock' in config).toBe(false)
  })

  it('normalizes internal links to canonical routes with the site base', async () => {
    const { code } = await compileMarkdownToVue(
      mdWithBase,
      `
[Root](/guide)
[Nested Base Route](/kawapress/api)
[Relative](./routing)
[Markdown](./getting-started.md?mode=quick#install)
[HTML](./deploy.html#platform)
[Index](./index.md)
[Asset](./manual.pdf)
[Heading](#section)
`,
      '/guide/current',
      '/guide/current.md',
    )

    expect(code.slice(0, code.indexOf('</template>') + '</template>'.length))
      .toMatchInlineSnapshot(`
        "<template><p><a href=\"/kawapress/guide\">Root</a>
        <a href=\"/kawapress/kawapress/api\">Nested Base Route</a>
        <a href=\"/kawapress/guide/routing\">Relative</a>
        <a href=\"/kawapress/guide/getting-started?mode=quick#install\">Markdown</a>
        <a href=\"/kawapress/guide/deploy#platform\">HTML</a>
        <a href=\"/kawapress/guide\">Index</a>
        <a href=\"/kawapress/guide/manual.pdf\">Asset</a>
        <a href=\"#section\">Heading</a></p>
        </template>"
      `)
  })

  it('resolves encoded relative links from the Markdown source path', async () => {
    const { code } = await compileMarkdownToVue(
      mdWithBase,
      '[下一页](./下一%20页.md)\n',
      '/指南 空间/current',
      '/指南 空间/current.md',
    )

    expect(code).toContain('href="/kawapress/指南 空间/下一 页"')
  })

  it('opens external Markdown links in a new tab without leaking referrer data', async () => {
    const { code } = await compileMarkdownToVue(
      md,
      '[Vue](https://vuejs.org/) [CDN](//cdn.example.com/library.js) [Email](mailto:hello@example.com)\n',
      '/links',
    )

    expect(code.slice(0, code.indexOf('</template>') + '</template>'.length))
      .toMatchInlineSnapshot(`
        "<template><p><a href=\"https://vuejs.org/\" target=\"_blank\" rel=\"noreferrer\">Vue</a> <a href=\"//cdn.example.com/library.js\" target=\"_blank\" rel=\"noreferrer\">CDN</a> <a href=\"mailto:hello@example.com\" target=\"_blank\" rel=\"noreferrer\">Email</a></p>
        </template>"
      `)
  })

  it('composes link attributes added by Markdown plugins', async () => {
    const runner = await createGeneratorPluginRunner([definePlugin({
      name: 'test:link-attributes',
      setup(api) {
        api.markdown((markdown) => {
          const renderLink = markdown.renderer.rules.link_open
          markdown.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
            const token = tokens[index]
            const href = token.attrGet('href') ?? ''
            if (href.includes('composed')) {
              token.attrSet('target', '_self')
              token.attrSet('rel', 'nofollow')
            }
            if (href.includes('download') || href.includes('source.md')) {
              token.attrSet('download', '')
            }
            return renderLink
              ? renderLink(tokens, index, options, env, renderer)
              : renderer.renderToken(tokens, index, options)
          }
        })
      },
    })])
    const compiler = await createMarkdownCompiler({
      base: '/kawapress/',
      pluginRunner: runner,
    })
    const { code } = await compileMarkdownToVue(
      compiler,
      '[Composed](https://example.com/composed) [Download](https://example.com/download) [Source](./source.md)\n',
      '/guide/current',
      '/guide/current.md',
    )

    expect(code.slice(0, code.indexOf('</template>') + '</template>'.length))
      .toMatchInlineSnapshot(`
        "<template><p><a href=\"https://example.com/composed\" target=\"_self\" rel=\"nofollow noreferrer\">Composed</a> <a href=\"https://example.com/download\" download=\"\">Download</a> <a href=\"/kawapress/guide/source.md\" download=\"\">Source</a></p>
        </template>"
      `)
  })

  it('renders GitHub-style tables with column alignment', async () => {
    const { code } = await compileMarkdownToVue(
      md,
      `
| Left | Center | Right |
| :--- | :----: | ----: |
| A | B | C |
`,
      '/tables',
    )

    expect(code.slice(0, code.indexOf('</template>') + '</template>'.length))
      .toMatchInlineSnapshot(`
        "<template><table>
        <thead>
        <tr>
        <th style=\"text-align:left\">Left</th>
        <th style=\"text-align:center\">Center</th>
        <th style=\"text-align:right\">Right</th>
        </tr>
        </thead>
        <tbody>
        <tr>
        <td style=\"text-align:left\">A</td>
        <td style=\"text-align:center\">B</td>
        <td style=\"text-align:right\">C</td>
        </tr>
        </tbody>
        </table>
        </template>"
      `)
  })

  it('gives empty pages a stable hydration root', async () => {
    const { code } = await compileMarkdownToVue(
      md,
      '---\nlayout: home\n---\n',
      '/',
    )
    expect(code).toContain('<span data-kawapress-empty-page hidden></span>')
  })

  it('keeps script setup blocks out of the template', async () => {
    const { code } = await compileMarkdownToVue(
      md,
      '# A\n\n<script setup>\nconst x = 1\n</script>\n',
      '/index',
    )
    expect(code).toContain('<script setup>')
    expect(code).toContain('const x = 1')
    const template = code.slice(
      code.indexOf('<template>'),
      code.indexOf('</template>'),
    )
    expect(template).not.toContain('script setup')
  })

  it('matches the injected page data script language to script setup', async () => {
    const { code } = await compileMarkdownToVue(
      md,
      '# A\n\n<script setup lang="ts">\nconst x = 1\n</script>\n',
      '/index',
    )

    expect(code).toContain('<script lang="ts">')
  })

  it('injects __pageData through a safe JSON.parse expression', async () => {
    const { code, pageData } = await compileMarkdownToVue(md, '# Hi\n', '/hi')
    const match = code.match(/__pageData = JSON\.parse\(("(?:[^"\\]|\\.)*")\)/)
    expect(match).toBeTruthy()

    const decoded = JSON.parse(JSON.parse(match![1]))
    expect(decoded).toEqual(pageData)
  })
})

describe('syntax highlighting', () => {
  it('highlights code blocks with shiki', async () => {
    const { code } = await compileMarkdownToVue(
      mdWithShiki,
      '```js\nconst a = 1\n```\n',
      '/x',
    )
    expect(code).toContain('class="shiki')
    expect(code).toContain('style="color:')
  })

  it('protects mustaches inside code blocks', async () => {
    const { code } = await compileMarkdownToVue(
      mdWithShiki,
      '```vue\n<div>{{ msg }}</div>\n```\n',
      '/x',
    )
    expect(code).toContain('{{ msg }}')
    expect(code).not.toContain('__KAWA_MUSTACHE_')
  })

  it('falls back to plain text for unknown languages', async () => {
    const { code } = await compileMarkdownToVue(
      mdWithShiki,
      '```cobol\nMOVE X TO Y\n```\n',
      '/x',
    )
    expect(code).toContain('MOVE X TO Y')
  })
})
