import type { KawaPressPlugin } from './plugin-api'

export interface KawapressConfig {
  title?: string
  srcDir?: string
  plugins?: KawaPressPlugin[]
}

export function defineConfig(config: KawapressConfig): KawapressConfig {
  return config
}

export type KawapressPreset
  = (config?: KawapressConfig) => KawapressConfig

export function definePreset(
  presetConfig: KawapressConfig,
): KawapressPreset {
  return (userConfig = {}) => ({
    ...presetConfig,
    ...userConfig,
    plugins: [
      ...(presetConfig.plugins ?? []),
      ...(userConfig.plugins ?? []),
    ],
  })
}
