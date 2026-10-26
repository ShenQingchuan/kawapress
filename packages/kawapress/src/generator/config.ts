import type { KawapressConfig } from '../api/config'
import type { KawaPressPlugin } from '../api/plugin'
import type { HeadConfig } from '../core/head'
import type { LocaleConfig, SiteConfig } from '../core/site'
import type { GeneratorPluginRunner } from '../plugin/generator-runner'
import { isAbsolute } from 'node:path'
import { normalizeBase } from '../core/base'
import { resolveHeadConfig } from '../core/head'
import { createGeneratorPluginRunner } from '../plugin/generator-runner'

export interface ResolvedSiteConfig {
  title: string
  base: string
  srcDir: string
  publicDir: string
  head: HeadConfig[]
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
    publicDir: userConfig.publicDir,
    head: userConfig.head,
    themeConfig: userConfig.themeConfig,
    locales: userConfig.locales,
  }
  await pluginRunner.runConfig(site)

  const srcDir = site.srcDir ?? '.'
  if (isAbsolute(srcDir)) {
    throw new Error(`KawaPress: srcDir must be relative to the site root, got ${JSON.stringify(srcDir)}`)
  }

  const publicDir = normalizePublicDir(site.publicDir ?? 'public')
  const head = resolveHeadConfig(site.head, {
    owner: 'the site config',
    path: 'head',
  })
  const locales = normalizeLocales(site.locales ?? DEFAULT_LOCALES)

  return {
    title: site.title ?? 'KawaPress',
    base: normalizeBase(site.base),
    srcDir,
    publicDir,
    head,
    themeConfig: site.themeConfig,
    locales,
    plugins,
    pluginRunner,
  }
}

function normalizePublicDir(publicDir: string): string {
  if (!publicDir.trim() || isAbsolute(publicDir)) {
    throw new Error(
      `KawaPress: publicDir must be a relative directory inside srcDir, got ${JSON.stringify(publicDir)}`,
    )
  }

  const segments = publicDir
    .replaceAll('\\', '/')
    .split('/')
    .filter(segment => Boolean(segment) && segment !== '.')
  if (segments.length === 0 || segments.includes('..')) {
    throw new Error(
      `KawaPress: publicDir must be a relative directory inside srcDir, got ${JSON.stringify(publicDir)}`,
    )
  }

  return segments.join('/')
}

function normalizeLocales(
  locales: Record<string, LocaleConfig>,
): Record<string, LocaleConfig> {
  const normalized: Record<string, LocaleConfig> = {}
  for (const [localeIndex, locale] of Object.entries(locales)) {
    validateLocale(localeIndex, locale)
    const head = resolveHeadConfig(locale.head, {
      owner: `locale ${JSON.stringify(localeIndex)} in the site config`,
      path: `locales.${localeIndex}.head`,
    })
    normalized[localeIndex] = head.length === 0
      ? locale
      : { ...locale, head }
  }
  return normalized
}

function validateLocale(localeIndex: string, locale: LocaleConfig): void {
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
