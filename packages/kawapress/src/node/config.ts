import type { KawapressConfig } from '../config'
import type { KawaPressPlugin } from '../plugin-api'
import type { SiteConfig } from '../site'
import type { GeneratorPluginRunner } from './plugin-runner'
import { isAbsolute } from 'node:path'
import { createGeneratorPluginRunner } from './plugin-runner'

export interface ResolvedSiteConfig {
  title: string
  srcDir: string
  plugins: KawaPressPlugin[]
  pluginRunner: GeneratorPluginRunner
}

export async function resolveSiteConfig(
  userConfig: KawapressConfig,
): Promise<ResolvedSiteConfig> {
  const plugins = userConfig.plugins ?? []
  const pluginRunner = await createGeneratorPluginRunner(plugins)
  const site: SiteConfig = {
    title: userConfig.title,
    srcDir: userConfig.srcDir,
  }
  await pluginRunner.runConfig(site)

  const srcDir = site.srcDir ?? '.'
  if (isAbsolute(srcDir)) {
    throw new Error(`KawaPress: srcDir must be relative to the site root, got ${JSON.stringify(srcDir)}`)
  }

  return {
    title: site.title ?? 'KawaPress',
    srcDir,
    plugins,
    pluginRunner,
  }
}
