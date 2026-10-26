import type { DeadLinkConfig } from '../core/dead-links'
import type { HeadConfig } from '../core/head'
import type { LocaleConfig } from '../core/site'
import type { KawaPressPlugin } from './plugin'

export interface KawapressConfig<ThemeConfig extends object = object> {
  title?: string
  base?: string
  srcDir?: string
  publicDir?: string
  head?: HeadConfig[]
  themeConfig?: ThemeConfig
  locales?: Record<string, LocaleConfig<ThemeConfig>>
  plugins?: KawaPressPlugin[]
  /** Internal link checking. Defaults to `{ level: 'error' }`; `false` disables it. */
  deadLinks?: false | DeadLinkConfig
}

export function defineConfig<ThemeConfig extends object = object>(
  config: KawapressConfig<ThemeConfig>,
): KawapressConfig<ThemeConfig> {
  return config
}

export type PresetConfig<
  ResolvedThemeConfig extends object,
  ThemeConfig extends object = Partial<ResolvedThemeConfig>,
> = KawapressConfig<ThemeConfig>

export type KawapressPreset<ThemeConfig extends object = object>
  = (config?: KawapressConfig<ThemeConfig>) => KawapressConfig<ThemeConfig>

export function definePreset<ThemeConfig extends object = object>(
  presetConfig: KawapressConfig<ThemeConfig>,
): KawapressPreset<ThemeConfig> {
  return (userConfig = {}) => ({
    ...presetConfig,
    ...userConfig,
    plugins: [
      ...(presetConfig.plugins ?? []),
      ...(userConfig.plugins ?? []),
    ],
  })
}
