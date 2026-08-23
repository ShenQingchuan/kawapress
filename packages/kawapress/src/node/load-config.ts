import type { KawapressConfig } from '../config'
import type { ResolvedSiteConfig } from './config'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createJiti } from 'jiti'
import { resolveSiteConfig } from './config'

export const CONFIG_FILE_NAME = 'kawapress.config.ts'

export async function loadSiteConfig(
  root: string,
): Promise<ResolvedSiteConfig> {
  const userConfig = await loadUserConfig(join(root, CONFIG_FILE_NAME))
  return resolveSiteConfig(userConfig)
}

async function loadUserConfig(configPath: string): Promise<KawapressConfig> {
  if (!existsSync(configPath)) {
    return {}
  }

  const configModule = await createJiti(
    import.meta.url,
    {
      moduleCache: false,
    },
  ).import(configPath) as { default?: KawapressConfig }

  return configModule.default ?? {}
}
