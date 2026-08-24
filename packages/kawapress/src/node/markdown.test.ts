import type { MarkdownExit } from 'markdown-exit'
import { shikiPlugin } from '@kawapress/plugin-shiki'
import { beforeAll, describe, expect, it } from 'vitest'
import { compileMarkdownToVue, createMarkdownCompiler } from './markdown'
import { createGeneratorPluginRunner } from './plugin-runner'

let md: MarkdownExit
let mdWithShiki: MarkdownExit
beforeAll(async () => {
  md = await createMarkdownCompiler()
  mdWithShiki = await createMarkdownCompiler({
    pluginRunner: await createGeneratorPluginRunner([shikiPlugin()]),
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
