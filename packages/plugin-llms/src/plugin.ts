import type {
  KawaPressPlugin,
  LocaleConfig,
  PageBuildArtifact,
  SiteConfig,
} from 'kawapress'
import type { MarkdownExit } from 'markdown-exit'
import type { InlineConfig } from 'vite'
import type { LlmsSiteContext } from './artifacts'
import type { SsgMarkdownBundle } from './ssg/render'
import type { LlmsPluginOptions } from './types'
import { rm, rmdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { definePlugin } from 'kawapress'
import { createLlmsArtifacts } from './artifacts'
import { SSG_MD_ENVIRONMENT } from './constants'
import { installLlmsActionsMarkdown } from './markdown-actions'
import { renderMarkdownPages } from './ssg/render'
import {
  createLlmsDevMiddlewarePlugin,
  createSsgMarkdownVitePlugin,
  SSG_MD_ENTRY_ID,
  ssgMarkdownDefine,
} from './vite-plugin'

const DEFAULT_LOCALES: Record<string, LocaleConfig> = {
  root: {
    label: 'English',
    lang: 'en',
  },
}
const SSG_MD_OUTPUT_DIR = 'dist/.kawapress/llms'
const SSG_MD_ENTRY_FILE = 'render.mjs'
const SSG_MD_ENTRY_OUTPUT_PATH = `.kawapress/llms/${SSG_MD_ENTRY_FILE}`

export function llmsPlugin(
  options: LlmsPluginOptions = {},
): KawaPressPlugin {
  let markdown: MarkdownExit | undefined
  let root = process.cwd()
  const pageArtifacts = new Map<string, PageBuildArtifact>()
  const site: LlmsSiteContext = {
    base: '/',
    title: 'KawaPress',
    locales: DEFAULT_LOCALES,
  }

  const getPages = (): readonly PageBuildArtifact[] => (
    [...pageArtifacts.values()].sort((left, right) => (
      left.sourcePath.localeCompare(right.sourcePath)
    ))
  )
  const vitePluginOptions = {
    getMarkdown: () => markdown,
    getPages,
    site,
    pluginOptions: options,
  }

  return definePlugin({
    name: '@kawapress/plugin-llms',
    setup(api) {
      api.config((config) => {
        captureSiteConfig(site, config)
      })
      api.markdown((compiler) => {
        markdown = compiler
        installLlmsActionsMarkdown(compiler)
      })
      api.pageArtifact((page) => {
        pageArtifacts.set(page.file, page)
      })
      api.vite((config) => {
        root = config.root ? resolve(config.root) : process.cwd()
        site.base = normalizeBase(config.base)
        installSsgMarkdownEnvironment(config)
        installSsgMarkdownPlugins(config, vitePluginOptions)
      })
      api.buildArtifacts(async ({ emitFile, importModule }) => {
        const outputDirectory = resolve(root, SSG_MD_OUTPUT_DIR)
        try {
          const bundle = await importModule<SsgMarkdownBundle>(
            SSG_MD_ENTRY_OUTPUT_PATH,
          )
          const rendered = await renderMarkdownPages(bundle, getPages())
          const artifacts = await createLlmsArtifacts(rendered, site, options)
          for (const [path, content] of artifacts) {
            await emitFile(path, content)
          }
        }
        finally {
          await rm(outputDirectory, { force: true, recursive: true })
          await removeEmptyDirectory(resolve(root, 'dist/.kawapress'))
        }
      })
    },
  })
}

export default llmsPlugin

function captureSiteConfig(site: LlmsSiteContext, config: SiteConfig): void {
  site.title = config.title ?? 'KawaPress'
  site.base = normalizeBase(config.base)
  site.locales = config.locales ?? DEFAULT_LOCALES
}

function installSsgMarkdownPlugins(
  config: InlineConfig,
  options: Parameters<typeof createSsgMarkdownVitePlugin>[0],
): void {
  config.plugins ??= []
  const markdownIndex = config.plugins.findIndex(plugin => (
    plugin !== null
    && plugin !== false
    && typeof plugin === 'object'
    && !Array.isArray(plugin)
    && 'name' in plugin
    && plugin.name === 'kawapress:markdown'
  ))
  if (markdownIndex < 0) {
    throw new Error('KawaPress LLMS: cannot find the KawaPress Markdown Vite plugin.')
  }
  config.plugins.splice(
    markdownIndex + 1,
    0,
    createSsgMarkdownVitePlugin(options),
  )
  config.plugins.push(createLlmsDevMiddlewarePlugin(options))
}

function installSsgMarkdownEnvironment(config: InlineConfig): void {
  config.define = {
    ...config.define,
    'import.meta.env.SSG_MD': 'false',
  }
  config.environments ??= {}
  if (config.environments[SSG_MD_ENVIRONMENT]) {
    throw new Error(
      `KawaPress LLMS: Vite environment ${JSON.stringify(SSG_MD_ENVIRONMENT)} already exists.`,
    )
  }
  config.environments[SSG_MD_ENVIRONMENT] = {
    consumer: 'server',
    define: ssgMarkdownDefine(),
    build: {
      copyPublicDir: false,
      emptyOutDir: false,
      outDir: SSG_MD_OUTPUT_DIR,
      rollupOptions: {
        input: SSG_MD_ENTRY_ID,
        output: {
          entryFileNames: SSG_MD_ENTRY_FILE,
        },
      },
    },
  }
}

async function removeEmptyDirectory(directory: string): Promise<void> {
  try {
    await rmdir(directory)
  }
  catch (error) {
    if (
      !(error instanceof Error)
      || !('code' in error)
      || (error.code !== 'ENOENT' && error.code !== 'ENOTEMPTY')
    ) {
      throw error
    }
  }
}

function normalizeBase(base: string | undefined): string {
  if (!base || base === '/') {
    return '/'
  }
  return `/${base.replace(/^\/+|\/+$/g, '')}/`
}
