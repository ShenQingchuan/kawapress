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

    expect(html).toContain('<KawaCodeGroup :labels=\'["npm","pnpm"]\'>')
    expect(html).toContain('<template #panel-0>')
    expect(html).toContain('<template #panel-1>')
    expect(html).toContain('npm install kawapress')
    expect(html).toContain('pnpm add kawapress')
  })

  it('rejects prose inside a code group', () => {
    expect(() => createMarkdown().render(`::: code-group
Not a code block.
:::`)).toThrow(
      'KawaPress code-group only accepts fenced code blocks',
    )
  })
})
