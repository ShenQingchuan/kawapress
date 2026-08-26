import type { Plugin } from 'vite'
import type { MarkdownPageLoader } from '../../../compiler/page-loader'
import { readFile } from 'node:fs/promises'
import { assembleVueSfc } from '../../../compiler/markdown'

export function markdownPlugin(pageLoader: MarkdownPageLoader): Plugin {
  return {
    name: 'kawapress:markdown',
    async load(id) {
      const [file, query] = id.split('?', 2)
      if (query || !file.endsWith('.md')) {
        return null
      }

      const source = await readFile(file, 'utf8')
      const { html, env, pageData } = await pageLoader.load(source, file)
      return assembleVueSfc(html, env, pageData)
    },
  }
}
