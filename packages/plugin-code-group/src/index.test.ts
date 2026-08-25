import { createMarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import { installCodeGroup } from './index'

function createMarkdown() {
  const markdown = createMarkdownExit({ html: true })
  installCodeGroup(markdown)
  return markdown
}

describe('code group markdown plugin', () => {
  it('turns titled fences into named Vue slots', () => {
    const html = createMarkdown().render(`::: code-group
\`\`\`sh [npm]
npm install kawapress
\`\`\`

\`\`\`sh [pnpm]
pnpm add kawapress
\`\`\`
:::`)

    expect(html).toMatchInlineSnapshot(`
      "<KawaCodeGroup :labels='["npm","pnpm"]'>
      <template #panel-0>
      <pre><code class="language-sh">npm install kawapress
      </code></pre>
      </template>
      <template #panel-1>
      <pre><code class="language-sh">pnpm add kawapress
      </code></pre>
      </template>
      </KawaCodeGroup>
      "
    `)
  })

  it('preserves an asynchronous fence renderer inside a panel', async () => {
    const markdown = createMarkdownExit({ html: true })
    markdown.renderer.rules.fence = async () => (
      '<pre class="async"><code>Async panel</code></pre>'
    )
    installCodeGroup(markdown)

    await expect(markdown.renderAsync(`::: code-group
\`\`\`js [Example]
source
\`\`\`
:::`)).resolves.toMatchInlineSnapshot(`
  "<KawaCodeGroup :labels='["Example"]'>
  <template #panel-0>
  <pre class="async"><code>Async panel</code></pre></template>
  </KawaCodeGroup>
  "
`)
  })

  it('rejects prose inside a code group', () => {
    expect(() => createMarkdown().render(`::: code-group
Not a code block.
:::`)).toThrow(
      'KawaPress code-group only accepts fenced code blocks',
    )
  })
})
