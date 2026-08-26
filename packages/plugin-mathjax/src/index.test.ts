import type { GeneratorPluginAPI } from 'kawapress'
import type { MarkdownExit } from 'markdown-exit'
import type { MathJaxPluginOptions } from './index'
import { createMarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import { mathjaxPlugin } from './index'

describe('mathjax plugin', () => {
  it('renders accessible inline and block SVG during Markdown compilation', async () => {
    const markdown = await createMarkdown()
    const html = await markdown.renderAsync(`Inline $a^2+b^2=c^2$ formula.

$$
\\int_0^1 x^2 \\, dx
$$
`)

    expect(html.match(/<mjx-container\b[^>]*>/g)).toMatchInlineSnapshot(`
      [
        "<mjx-container v-pre data-kawa-math="inline" class="MathJax" jax="SVG" overflow="overflow" style="position: relative;">",
        "<mjx-container v-pre data-kawa-math="block" tabindex="0" class="MathJax" jax="SVG" overflow="overflow" display="true" style="position: relative;">",
      ]
    `)
    expect(html.match(/<mjx-assistive-mml\b/g)).toHaveLength(2)
    expect(html.match(/<svg\b/g)).toHaveLength(2)
    expect(html).not.toContain('<script')
  })

  it('isolates equation counters and labels between pages', async () => {
    const markdown = await createMarkdown({ tex: { tags: 'all' } })
    const firstPage = await markdown.renderAsync(`$$
x \\label{shared}
$$

$$
y
$$

Reference $\\ref{shared}$.
`)
    const secondPage = await markdown.renderAsync(`$$
z
$$

Reference $\\ref{shared}$.
`)

    expect(firstPage.match(/id="mjx-eqn:[^"]+"/g)).toEqual([
      'id="mjx-eqn:shared"',
      'id="mjx-eqn:2"',
    ])
    expect(firstPage).toContain('href="#mjx-eqn%3Ashared"')
    expect(secondPage.match(/id="mjx-eqn:[^"]+"/g)).toEqual([
      'id="mjx-eqn:1"',
    ])
    expect(secondPage).toContain('<mtext>???</mtext>')
    expect(secondPage).not.toContain('mjx-eqn%3Ashared')
  })

  it('rejects interactive action macros with a static-rendering error', async () => {
    await expect(createMarkdown({
      tex: { packages: ['action'] },
    })).rejects.toThrowError(
      'MathJax interactive action macros are not supported by static rendering. Remove "action" from tex.packages.',
    )
  })

  it('passes TeX macros and keeps currency-like dollar text literal', async () => {
    const markdown = await createMarkdown({
      tex: {
        macros: {
          half: '\\frac{1}{2}',
        },
      },
    })
    const html = await markdown.renderAsync(
      'A value $\\half$ costs $20, not $30. Escaped \\$ stays literal.\n',
    )

    expect(html).toContain('data-latex="\\frac{1}{2}"')
    expect(html).toContain('costs $20, not $30. Escaped $ stays literal.')
    expect(html.match(/<mjx-container\b/g)).toHaveLength(1)
  })
})

async function createMarkdown(
  options: MathJaxPluginOptions = {},
): Promise<MarkdownExit> {
  let markdownHandler: Parameters<GeneratorPluginAPI['markdown']>[0] | undefined
  await mathjaxPlugin(options).setup({
    config() {},
    markdown(handler) {
      markdownHandler = handler
    },
    pageData() {},
    vite() {},
  })
  if (!markdownHandler) {
    throw new Error('Expected MathJax to register a Markdown handler.')
  }

  const markdown = createMarkdownExit({ html: true })
  await markdownHandler(markdown)
  return markdown
}
