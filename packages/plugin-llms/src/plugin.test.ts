import type { IncomingHttpHeaders } from 'node:http'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { get } from 'node:http'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildSite } from '../../kawapress/src/server/build'
import { createDevServer } from '../../kawapress/src/server/dev'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => (
    rm(directory, { force: true, recursive: true })
  )))
})

describe('llms plugin', () => {
  it('builds faithful Markdown, locale indexes, exclusions, and SSR actions', async () => {
    const root = await createTemporaryDirectory()
    await mkdir(join(root, 'en'))
    await Promise.all([
      writeFile(join(root, 'kawapress.config.ts'), `
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'Kawa Docs',
  locales: {
    root: { label: '简体中文', lang: 'zh-CN' },
    en: { label: 'English', lang: 'en' },
  },
  llms: {
    description: {
      root: 'KawaPress 中文文档。',
      en: 'KawaPress English documentation.',
    },
    llmsTxt({ defaultContent, locale }) {
      return defaultContent + '\\n<!-- locale: ' + locale + ' -->'
    },
  },
})
`),
      writeFile(join(root, 'Greeting.vue'), `
<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<template>
  <strong>Hello {{ name }}</strong>
</template>
`),
      writeFile(join(root, 'index.md'), `---
layout: home
---
# Kawa Docs
`),
      writeFile(join(root, 'guide.md'), `---
description: Vue-powered guide.
---
<script setup lang="ts">
import Greeting from './Greeting.vue'
import { SsgMarkdown } from '../../packages/plugin-llms/src/client'

const doubled = 2 + 2
</script>

# 使用指南

Static **Markdown** stays source-shaped.

\`\`\`text
first


third
\`\`\`

<Greeting name="KawaPress" />

Result: {{ doubled }}.

<SsgMarkdown :content="'## Adapted component\\n\\nPreserved *exactly*.'" />

<style scoped>
.unused { color: red; }
</style>
`),
      writeFile(join(root, 'private.md'), `---
llms: false
---
# Private
`),
      writeFile(join(root, 'en/index.md'), '# English Home\n'),
    ])

    await buildSite(root)

    const guideMarkdown = await readFile(join(root, 'dist/guide.md'), 'utf8')
    const rootIndex = await readFile(join(root, 'dist/llms.txt'), 'utf8')
    const englishIndex = await readFile(join(root, 'dist/en/llms.txt'), 'utf8')
    const full = await readFile(join(root, 'dist/llms-full.txt'), 'utf8')
    const guideHtml = await readFile(join(root, 'dist/guide.html'), 'utf8')

    expect(guideMarkdown).toMatchInlineSnapshot(`
      "# 使用指南

      > 本页是 使用指南 的 Markdown 正文。站点索引见 [llms.txt](/llms.txt)，完整文档见 [llms-full.txt](/llms-full.txt)。

      Static **Markdown** stays source-shaped.

      \`\`\`text
      first


      third
      \`\`\`

      **Hello KawaPress**

      Result: 4.

      ## Adapted component

      Preserved *exactly*.
      "
    `)

    expect(rootIndex).toContain('> KawaPress 中文文档。')
    expect(rootIndex).toContain('[使用指南](/guide.md): Vue-powered guide.')
    expect(rootIndex).toContain('<!-- locale: root -->')
    expect(rootIndex).not.toContain('Private')
    expect(englishIndex).toContain('> KawaPress English documentation.')
    expect(englishIndex).toContain('[English Home](/en/index.md)')
    expect(englishIndex).toContain('<!-- locale: en -->')
    expect(full).toContain('<!-- Source: /guide.md -->')
    await expect(access(join(root, 'dist/private.md'))).rejects.toThrow()

    expect(guideHtml).toContain('class="kawa-llms-actions"')
    expect(guideHtml).toContain('aria-expanded="false"')
    expect(guideHtml).toContain('复制页面 Markdown')
    expect(guideHtml).toContain('id="nagi-initial-appearance"')
    expect(guideHtml).toContain('id="nagi-initial-sidebar-width"')
    await expect(access(join(root, 'dist/.kawapress'))).rejects.toThrow()
  })

  it('serves page Markdown without intercepting Vite module requests', async () => {
    const root = await createTemporaryDirectory()
    await Promise.all([
      writeFile(join(root, 'kawapress.config.ts'), `
import { nagi } from 'kawapress/nagi'
export default nagi({ title: 'Dev Docs' })
`),
      writeFile(join(root, 'index.md'), '# Home\n'),
      writeFile(join(root, 'guide.md'), '# Guide\n\nValue: {{ 2 + 2 }}.\n\nRoot-level `<script setup>` is supported.\n'),
    ])
    const server = await createDevServer(root, { hmr: false, port: 0 })

    try {
      const markdown = await request(server.port, '/guide.md')
      expect(markdown.status, markdown.body).toBe(200)
      expect(markdown.contentType).toContain('text/markdown')
      expect(markdown.body).toContain('Value: 4.')

      const module = await request(server.port, '/guide.md', {
        'sec-fetch-dest': 'script',
      })
      expect(module.status).toBe(200)
      expect(module.contentType).toContain('text/javascript')
      expect(module.body).toContain('__pageData')
    }
    finally {
      await server.close()
    }
  })
})

interface TestResponse {
  body: string
  contentType: string
  status: number
}

function request(
  port: number,
  path: string,
  headers: IncomingHttpHeaders = {},
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const request = get({
      host: '127.0.0.1',
      port,
      path,
      headers: {
        connection: 'close',
        ...headers,
      },
    }, (response) => {
      response.setEncoding('utf8')
      let body = ''
      response.on('data', chunk => body += chunk)
      response.on('end', () => resolve({
        body,
        contentType: String(response.headers['content-type'] ?? ''),
        status: response.statusCode ?? 0,
      }))
    })
    request.on('error', reject)
  })
}

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(process.cwd(), 'docs/kawapress-llms-'))
  temporaryDirectories.push(directory)
  return directory
}
