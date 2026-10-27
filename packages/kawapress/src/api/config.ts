import type { DeadLinkConfig } from '../core/dead-links'
import type { ThemeConfig } from '../core/extension-points'
import type { HeadConfig } from '../core/head'
import type { LocaleConfig } from '../core/site'
import type { KawaPressPlugin } from './plugin'

export interface KawapressConfig {
  title?: string
  base?: string
  srcDir?: string
  publicDir?: string
  head?: HeadConfig[]
  themeConfig?: Partial<ThemeConfig>
  locales?: Record<string, LocaleConfig>
  plugins?: KawaPressPlugin[]
  /** Internal link checking. Defaults to `{ level: 'error' }`; `false` disables it. */
  deadLinks?: false | DeadLinkConfig
}

export function defineConfig(config: KawapressConfig): KawapressConfig {
  return config
}

export type KawapressPreset = (config?: KawapressConfig) => KawapressConfig

export function definePreset(presetConfig: KawapressConfig): KawapressPreset {
  return (userConfig = {}) => ({
    ...presetConfig,
    ...userConfig,
    plugins: [
      ...(presetConfig.plugins ?? []),
      ...(userConfig.plugins ?? []),
    ],
  })
}
