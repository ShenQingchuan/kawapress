import type { KawapressConfig } from '../config'
import type { ResolvedSiteConfig } from './config'
import { existsSync } from 'node:fs'
import { realpath } from 'node:fs/promises'
import { isAbsolute, join, relative, sep } from 'node:path'
import { runnerImport } from 'vite'
import { resolveSiteConfig } from './config'

export const CONFIG_FILE_NAME = 'kawapress.config.ts'

export interface LoadedSiteConfig {
  config: ResolvedSiteConfig
  dependencies: string[]
}

export async function loadSiteConfig(
  root: string,
): Promise<ResolvedSiteConfig> {
  return (await loadSiteConfigWithDependencies(root)).config
}

export async function loadSiteConfigWithDependencies(
  root: string,
): Promise<LoadedSiteConfig> {
  const resolvedRoot = await realpath(root)
  const configPath = join(resolvedRoot, CONFIG_FILE_NAME)
  const loaded = await loadUserConfig(resolvedRoot, configPath)
  return {
    config: await resolveSiteConfig(loaded.config),
    dependencies: loaded.dependencies,
  }
}

async function loadUserConfig(
  root: string,
  configPath: string,
): Promise<{ config: KawapressConfig, dependencies: string[] }> {
  if (!existsSync(configPath)) {
    return { config: {}, dependencies: [] }
  }

  const result = await runnerImport<{ default?: KawapressConfig }>(configPath, {
    root,
    resolve: {
      conditions: ['module'],
    },
    ssr: {
      noExternal: ['kawapress', /^@kawapress\//],
    },
  })
  const dependencies = [
    configPath,
    ...result.dependencies.filter(file => isInsideRoot(file, root)),
  ]

  return {
    config: result.module.default ?? {},
    dependencies: [...new Set(dependencies)],
  }
}

function isInsideRoot(file: string, root: string): boolean {
  const path = relative(root, file)
  return !isAbsolute(path)
    && path !== '..'
    && !path.startsWith(`..${sep}`)
    && !path.split(sep).includes('node_modules')
}
