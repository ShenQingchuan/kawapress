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
  BuildArtifactsContext,
  GeneratorPluginAPI,
  GeneratorPluginHandler,
  GeneratorPluginSetup,
  KawaPressPlugin,
  MaybePromise,
  PageBuildArtifact,
  PageDataContext,
  PageDataHandler,
  RuntimePlugin,
  RuntimePluginAPI,
  RuntimePluginHandler,
  RuntimePluginSetup,
} from './api/plugin'
export { useMarkdownItPlugin } from './compiler/markdown-it-compat'
export type { MarkdownItPluginHost } from './compiler/markdown-it-compat'
export { findDeadLinks, findPageDeadLinks, formatDeadLink } from './core/dead-links'
export type {
  DeadLink,
  DeadLinkConfig,
  DeadLinkIgnore,
  DeadLinkReason,
  DeadLinkSite,
  LinkRecord,
  PageLinks,
  ResolvedDeadLinkConfig,
} from './core/dead-links'
export { normalizeFrontmatterSource } from './core/frontmatter'
export type { HeadAttrs, HeadConfig, HeadTag } from './core/head'
export { assertJsonSerializable, parseJson, stringifyJson } from './core/json'
export type { JsonOperationOptions } from './core/json'
export { markdownPagePathToRoutePath } from './core/markdown-route'
export { OUTLET_NAMES } from './core/outlet'
export type {
  OutletItem,
  OutletItemInput,
  OutletName,
  OutletRegistry,
} from './core/outlet'
export { resolveDocumentTitle, resolvePageMetadata } from './core/page-metadata'
export type { PageMetadata } from './core/page-metadata'
export type {
  LocaleConfig,
  LocaleDirection,
  LocaleLink,
  PageData,
  PageHeader,
  PageRouteMeta,
  ResolvedSiteData,
  SiteConfig,
  SiteData,
} from './core/site'
export { KAWA_DEFAULT_TOKENS, KAWA_LAYER_ORDER, KAWA_TOKEN_NAMES } from './core/tokens'
export type { KawaTokenName } from './core/tokens'
