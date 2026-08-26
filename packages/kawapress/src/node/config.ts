import type { KawapressConfig } from '../api/config'
import type { KawaPressPlugin } from '../api/plugin'
import type { LocaleConfig, SiteConfig } from '../core/site'
import type { GeneratorPluginRunner } from './plugin-runner'
import { isAbsolute } from 'node:path'
import { normalizeBase } from '../core/base'
import { createGeneratorPluginRunner } from './plugin-runner'

export interface ResolvedSiteConfig {
  title: string
  base: string
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
    base: userConfig.base,
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
    base: normalizeBase(site.base),
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
