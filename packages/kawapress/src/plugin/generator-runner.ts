import type { MarkdownExit } from 'markdown-exit'
import type { UserConfig } from 'vite'
import type {
  GeneratorPluginAPI,
  KawaPressPlugin,
} from '../api/plugin'
import type { PageData, SiteConfig } from '../core/site'
import { assertPageDataSerializable } from '../core/site'
import {
  createPluginHandlerRegistry,
  runPluginSetup,
} from './execution'

export interface GeneratorPluginRunner {
  runConfig: (config: SiteConfig) => Promise<void>
  runMarkdown: (markdown: MarkdownExit) => Promise<void>
  runPageData: (pageData: PageData) => Promise<void>
  runVite: (config: UserConfig) => Promise<void>
}

export async function createGeneratorPluginRunner(
  plugins: KawaPressPlugin[],
): Promise<GeneratorPluginRunner> {
  const configHandlers = createPluginHandlerRegistry<SiteConfig>('generator', 'config')
  const markdownHandlers = createPluginHandlerRegistry<MarkdownExit>('generator', 'markdown')
  const pageDataHandlers = createPluginHandlerRegistry<PageData>('generator', 'pageData', {
    afterEachHandle: assertPageDataSerializable,
  })
  const viteHandlers = createPluginHandlerRegistry<UserConfig>('generator', 'vite')

  for (const plugin of plugins) {
    const api: GeneratorPluginAPI = {
      config: handler => configHandlers.add(plugin.name, handler),
      markdown: handler => markdownHandlers.add(plugin.name, handler),
      pageData: handler => pageDataHandlers.add(plugin.name, handler),
      vite: handler => viteHandlers.add(plugin.name, handler),
    }

    await runPluginSetup(
      'generator',
      plugin.name,
      () => plugin.setup(api),
    )
  }

  return {
    runConfig: configHandlers.run,
    runMarkdown: markdownHandlers.run,
    runPageData: pageDataHandlers.run,
    runVite: viteHandlers.run,
  }
}
