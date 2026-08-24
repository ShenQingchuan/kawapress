import type { KawapressConfig } from '../config'
import type { KawaPressPlugin } from '../plugin-api'
import type { LocaleConfig, SiteConfig } from '../site'
import type { GeneratorPluginRunner } from './plugin-runner'
import { isAbsolute } from 'node:path'
import { createGeneratorPluginRunner } from './plugin-runner'

export interface ResolvedSiteConfig {
  title: string
  srcDir: string
  themeConfig?: object
  locales: Record<string, LocaleConfig>
  plugins: KawaPressPlugin[]
  pluginRunner: GeneratorPluginRunner
}

const DEFAULT_LOCALES: Record<string, LocaleConfig> = {
  root: {
    label: 'English',
    lang: 'en',
  },
}

export async function resolveSiteConfig(
  userConfig: KawapressConfig,
): Promise<ResolvedSiteConfig> {
  const plugins = userConfig.plugins ?? []
  const pluginRunner = await createGeneratorPluginRunner(plugins)
  const site: SiteConfig = {
    title: userConfig.title,
    srcDir: userConfig.srcDir,
    themeConfig: userConfig.themeConfig,
    locales: userConfig.locales,
  }
  await pluginRunner.runConfig(site)

  const srcDir = site.srcDir ?? '.'
  if (isAbsolute(srcDir)) {
    throw new Error(`KawaPress: srcDir must be relative to the site root, got ${JSON.stringify(srcDir)}`)
  }

  const locales = site.locales ?? DEFAULT_LOCALES
  validateLocales(locales)

  return {
    title: site.title ?? 'KawaPress',
    srcDir,
    themeConfig: site.themeConfig,
    locales,
    plugins,
    pluginRunner,
  }
}

function validateLocales(locales: Record<string, LocaleConfig>): void {
  for (const [localeIndex, locale] of Object.entries(locales)) {
    if (!localeIndex || (localeIndex !== 'root' && /[/?#]/.test(localeIndex))) {
      throw new Error(
        `KawaPress: locale key ${JSON.stringify(localeIndex)} must be "root" or one URL path segment.`,
      )
    }
    if (!locale.label.trim()) {
      throw new Error(
        `KawaPress: locale ${JSON.stringify(localeIndex)} must have a non-empty label.`,
      )
    }
  }
}
