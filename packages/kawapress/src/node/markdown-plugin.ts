import type { Plugin } from 'vite'
import type { MarkdownPageLoader } from '../compiler/page-loader'
import { assembleVueSfc } from '../compiler/markdown'

export function markdownPlugin(pageLoader: MarkdownPageLoader): Plugin {
  return {
    name: 'kawapress:markdown',
    enforce: 'pre',
    async transform(code, id) {
      const [file, query] = id.split('?', 2)
      if (query || !file.endsWith('.md')) {
        return null
      }

      const { html, env, pageData } = await pageLoader.load(code, file)
      return assembleVueSfc(html, env, pageData)
    },
  }
}
