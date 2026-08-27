import type { DataLoaderConfig } from '../../api/data'
import type { SiteData } from '../../core/site'
import type { GeneratorPluginRunner } from '../../plugin/generator-runner'
import type { ResolvedSiteConfig } from '../config'
import { resolve } from 'node:path'

const DATA_LOADER_CONTEXT = Symbol.for('kawapress.data-loader-context')

export interface InternalDataLoaderContext extends DataLoaderConfig {
  readonly pluginRunner: GeneratorPluginRunner
}

export function createDataLoaderContext(
  root: string,
  config: ResolvedSiteConfig,
): InternalDataLoaderContext {
  const resolvedRoot = resolve(root)
  const srcDir = resolve(resolvedRoot, config.srcDir)
  const site: SiteData = {
    title: config.title,
    base: config.base,
    locales: config.locales,
    ...(config.themeConfig === undefined
      ? {}
      : { themeConfig: config.themeConfig }),
  }

  return {
    root: resolvedRoot,
    srcDir,
    publicDir: resolve(srcDir, config.publicDir),
    site,
    pluginRunner: config.pluginRunner,
  }
}

export function installDataLoaderContext(
  context: InternalDataLoaderContext,
): void {
  Reflect.set(globalThis, DATA_LOADER_CONTEXT, context)
  globalThis.KAWAPRESS_CONFIG = {
    root: context.root,
    srcDir: context.srcDir,
    publicDir: context.publicDir,
    site: context.site,
  }
}

export function getDataLoaderContext(): InternalDataLoaderContext {
  const context: unknown = Reflect.get(globalThis, DATA_LOADER_CONTEXT)
  if (!isDataLoaderContext(context)) {
    throw new Error(
      'KawaPress: data loading requires an active KawaPress dev or build process.',
    )
  }
  return context
}

function isDataLoaderContext(
  value: unknown,
): value is InternalDataLoaderContext {
  return typeof value === 'object'
    && value !== null
    && 'root' in value
    && 'srcDir' in value
    && 'publicDir' in value
    && 'site' in value
    && 'pluginRunner' in value
}
