import type { Plugin } from 'vite'
import type { GeneratorPluginRunner } from './plugin-runner'
import { assembleVueSfc, createMarkdownCompiler, parseMarkdown } from './markdown'

export function markdownPlugin(pluginRunner: GeneratorPluginRunner): Plugin {
  const mdPromise = createMarkdownCompiler({ pluginRunner })

  return {
    name: 'kawapress:markdown',
    enforce: 'pre',
    async transform(code, id) {
      const [file, query] = id.split('?', 2)
      if (query || !file.endsWith('.md')) {
        return null
      }
      const md = await mdPromise
      const { html, env, pageData } = parseMarkdown(
        md,
        code,
        file.replace(/\.md$/, ''),
      )
      await pluginRunner.runPageData(pageData)
      return assembleVueSfc(html, env, pageData)
    },
  }
}
