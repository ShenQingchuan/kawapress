import type { LocaleConfig } from '../core/site'
import type { KawaPressPlugin } from './plugin'

export interface KawapressConfig<ThemeConfig extends object = object> {
  title?: string
  base?: string
  srcDir?: string
  publicDir?: string
  themeConfig?: ThemeConfig
  locales?: Record<string, LocaleConfig<ThemeConfig>>
  plugins?: KawaPressPlugin[]
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
