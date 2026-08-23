import type { MarkdownExit } from 'markdown-exit'
import type { UserConfig } from 'vite'
import type { App } from 'vue'
import type { Router } from 'vue-router'
import type { PageData, SiteConfig } from './site'

export type MaybePromise<T> = T | Promise<T>

export type GeneratorPluginHandler<T> = (value: T) => MaybePromise<void>

export interface GeneratorPluginAPI {
  config: (handler: GeneratorPluginHandler<SiteConfig>) => void
  markdown: (handler: GeneratorPluginHandler<MarkdownExit>) => void
  pageData: (handler: GeneratorPluginHandler<PageData>) => void
  vite: (handler: GeneratorPluginHandler<UserConfig>) => void
}

export type GeneratorPluginSetup
  = (api: GeneratorPluginAPI) => MaybePromise<void>

export interface KawaPressPlugin {
  name: string
  setup: GeneratorPluginSetup
}

export function definePlugin(plugin: KawaPressPlugin): KawaPressPlugin {
  return plugin
}

export type RuntimePluginHandler<T> = (value: T) => MaybePromise<void>

export interface RuntimePluginAPI {
  vueApp: (handler: RuntimePluginHandler<App>) => void
  router: (handler: RuntimePluginHandler<Router>) => void
}

export type RuntimePluginSetup
  = (api: RuntimePluginAPI) => MaybePromise<void>

export interface RuntimePlugin {
  name: string
  setup: RuntimePluginSetup
}

export function defineRuntimePlugin(plugin: RuntimePlugin): RuntimePlugin {
  return plugin
}
