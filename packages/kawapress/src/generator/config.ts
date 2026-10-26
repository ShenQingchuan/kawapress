import type { KawapressConfig } from '../api/config'
import type { KawaPressPlugin } from '../api/plugin'
import type { DeadLinkIgnore, ResolvedDeadLinkConfig } from '../core/dead-links'
import type { LocaleConfig, SiteConfig } from '../core/site'
import type { GeneratorPluginRunner } from '../plugin/generator-runner'
import { isAbsolute } from 'node:path'
import { normalizeBase } from '../core/base'
import { createGeneratorPluginRunner } from '../plugin/generator-runner'

export interface ResolvedSiteConfig {
  title: string
  base: string
  srcDir: string
  publicDir: string
  themeConfig?: object
  locales: Record<string, LocaleConfig>
  plugins: KawaPressPlugin[]
  pluginRunner: GeneratorPluginRunner
  /** Internal link checking, or `false` when the site disabled it. */
  deadLinks: ResolvedDeadLinkConfig | false
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
    themeConfig: userConfig.themeConfig,
    locales: userConfig.locales,
  }
  await pluginRunner.runConfig(site)

  const srcDir = site.srcDir ?? '.'
  if (isAbsolute(srcDir)) {
    throw new Error(`KawaPress: srcDir must be relative to the site root, got ${JSON.stringify(srcDir)}`)
  }

  const publicDir = normalizePublicDir(site.publicDir ?? 'public')
  const locales = site.locales ?? DEFAULT_LOCALES
  validateLocales(locales)
  const deadLinks = resolveDeadLinks(userConfig.deadLinks)

  return {
    title: site.title ?? 'KawaPress',
    base: normalizeBase(site.base),
    srcDir,
    publicDir,
    themeConfig: site.themeConfig,
    locales,
    plugins,
    pluginRunner,
    deadLinks,
  }
}

function resolveDeadLinks(
  deadLinks: KawapressConfig['deadLinks'],
): ResolvedDeadLinkConfig | false {
  if (deadLinks === false) {
    return false
  }
  if (deadLinks === undefined) {
    return { level: 'error', ignore: [] }
  }
  if (typeof deadLinks !== 'object' || deadLinks === null || Array.isArray(deadLinks)) {
    throw new Error(
      `KawaPress: deadLinks must be false or an object, got ${JSON.stringify(deadLinks)} in kawapress.config.ts.`,
    )
  }

  const level = deadLinks.level ?? 'error'
  if (level !== 'error' && level !== 'warn') {
    throw new Error(
      `KawaPress: deadLinks.level must be "error" or "warn", got ${JSON.stringify(level)} in kawapress.config.ts.`,
    )
  }

  const ignore = deadLinks.ignore ?? []
  if (!Array.isArray(ignore)) {
    throw new TypeError(
      'KawaPress: deadLinks.ignore must be an array of strings, regular expressions, or functions in kawapress.config.ts.',
    )
  }
  ignore.forEach((entry, index) => {
    if (!isDeadLinkIgnore(entry)) {
      throw new Error(
        `KawaPress: deadLinks.ignore[${index}] must be a string, regular expression, or function, got ${describeValue(entry)} in kawapress.config.ts.`,
      )
    }
  })

  return { level, ignore: [...ignore] }
}

function isDeadLinkIgnore(value: unknown): value is DeadLinkIgnore {
  return typeof value === 'string'
    || typeof value === 'function'
    || value instanceof RegExp
}

function describeValue(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  return Array.isArray(value) ? 'an array' : typeof value
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
