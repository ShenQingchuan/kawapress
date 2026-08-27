export { defineConfig, definePreset } from './api/config'
export type { KawapressConfig, KawapressPreset, PresetConfig } from './api/config'
export { createContentLoader, defineLoader } from './api/data'
export type {
  ContentData,
  ContentExcerpt,
  ContentExcerptFile,
  ContentLoader,
  ContentLoaderOptions,
  DataLoader,
  DataLoaderConfig,
  DataLoaderGlobOptions,
  DataLoaderOptions,
} from './api/data'
export { definePlugin, defineRuntimePlugin } from './api/plugin'
export type {
  GeneratorPluginAPI,
  GeneratorPluginHandler,
  GeneratorPluginSetup,
  KawaPressPlugin,
  RuntimePlugin,
  RuntimePluginAPI,
  RuntimePluginHandler,
  RuntimePluginSetup,
} from './api/plugin'
export { useMarkdownItPlugin } from './compiler/markdown-it-compat'
export type { MarkdownItPluginHost } from './compiler/markdown-it-compat'
export { normalizeFrontmatterSource } from './core/frontmatter'
export { assertJsonSerializable, parseJson, stringifyJson } from './core/json'
export type { JsonOperationOptions } from './core/json'
export { markdownPagePathToRoutePath } from './core/markdown-route'
export { resolveDocumentTitle, resolvePageMetadata } from './core/page-metadata'
export type { PageMetadata } from './core/page-metadata'
export type {
  LocaleConfig,
  LocaleDirection,
  LocaleLink,
  PageData,
  PageHeader,
  ResolvedSiteData,
  SiteConfig,
  SiteData,
} from './core/site'
