import type { MarkdownItContainerOptions } from '@mdit/plugin-container'
import type { MarkdownExit, Token } from 'markdown-exit'
import type { Dirent } from 'node:fs'
import type { Plugin } from 'vite'
import type { SearchDocument } from './search'
import { readdir, readFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { frontmatterPlugin } from '@mdit-vue/plugin-frontmatter'
import { alert as alertPlugin } from '@mdit/plugin-alert'
import { attrs as attrsPlugin } from '@mdit/plugin-attrs'
import { container as containerPlugin } from '@mdit/plugin-container'
import { stringifyJson, useMarkdownItPlugin } from 'kawapress'
import { createMarkdownExit } from 'markdown-exit'
import anchorPlugin from 'markdown-it-anchor'
import { createSearchIndex } from './search'

export const SEARCH_INDEX_MODULE_ID = 'virtual:kawapress-search-index'
const RESOLVED_MODULE_ID = `\0${SEARCH_INDEX_MODULE_ID}`
const INDEX_MODULE_PREFIX = `${SEARCH_INDEX_MODULE_ID}/`
const RESOLVED_INDEX_MODULE_PREFIX = `\0${INDEX_MODULE_PREFIX}`
const IGNORED_DIRECTORIES = new Set(['dist', 'node_modules'])

export type SearchGitHubAlertType = 'note'
  | 'tip'
  | 'important'
  | 'warning'
  | 'caution'

export type SearchGitHubAlertLabels = Record<SearchGitHubAlertType, string>

export interface SearchCalloutOptions {
  containers?: boolean
  githubAlerts?: boolean | {
    labels?: Partial<SearchGitHubAlertLabels>
    localeLabels?: Record<string, Partial<SearchGitHubAlertLabels>>
  }
}

interface SearchIndexPluginOptions {
  srcDir: string
  locales: string[]
  localeLanguages?: Record<string, string | undefined>
  callouts?: SearchCalloutOptions
}

interface SearchMarkdownEnv {
  frontmatter?: Record<string, unknown>
  references?: Record<string, { title: string, href: string }>
}

interface CreateSearchDocumentsOptions {
  language?: string
  localeIndex?: string
  callouts?: SearchCalloutOptions
}

interface LoadSearchIndexesOptions {
  localeLanguages?: Record<string, string | undefined>
  callouts?: SearchCalloutOptions
}

interface MutableSearchSection {
  id: string
  title: string
  titles: string[]
  text: string[]
}

const SEARCH_CONTAINER_TYPES = [
  'info',
  'tip',
  'warning',
  'danger',
  'details',
] as const

const DEFAULT_GITHUB_ALERT_LABELS = {
  en: {
    note: 'Note',
    tip: 'Tip',
    important: 'Important',
    warning: 'Warning',
    caution: 'Caution',
  },
  zh: {
    note: '注意',
    tip: '提示',
    important: '重要',
    warning: '警告',
    caution: '小心',
  },
} as const

const searchMarkdownCache = new Map<string, MarkdownExit>()

function getSearchMarkdown(callouts: SearchCalloutOptions = {}): MarkdownExit {
  const key = `${Boolean(callouts.containers)}:${Boolean(callouts.githubAlerts)}`
  const cached = searchMarkdownCache.get(key)
  if (cached) {
    return cached
  }

  const markdown = createMarkdownExit({ html: true })
  useMarkdownItPlugin(markdown, frontmatterPlugin)
  useMarkdownItPlugin(markdown, attrsPlugin, {
    allowed: ['id'],
    rule: ['heading'],
  })
  useMarkdownItPlugin(markdown, anchorPlugin, { level: [1, 2, 3, 4, 5, 6] })
  if (callouts.githubAlerts) {
    useMarkdownItPlugin(markdown, alertPlugin, {
      alertNames: ['note', 'tip', 'important', 'warning', 'caution'],
      deep: false,
    })
  }
  if (callouts.containers) {
    for (const type of SEARCH_CONTAINER_TYPES) {
      const options: MarkdownItContainerOptions = {
        name: type,
        validate: params => params.trim().split(/\s+/, 1)[0] === type,
      }
      useMarkdownItPlugin(markdown, containerPlugin, options)
    }
  }

  searchMarkdownCache.set(key, markdown)
  return markdown
}

export function searchIndexPlugin(
  options: SearchIndexPluginOptions,
): Plugin {
  const localeIndexes = [...new Set(['root', ...options.locales])]
  let sourceRoot = resolve(options.srcDir)
  let indexVersion = 0
  let cachedIndexes: Promise<Record<string, string>> | undefined
  const resolvedIndexModules = new Set<string>()

  function getIndexes(): Promise<Record<string, string>> {
    return cachedIndexes ??= loadSearchIndexes(
      sourceRoot,
      localeIndexes,
      {
        localeLanguages: options.localeLanguages,
        callouts: options.callouts,
      },
    )
  }

  return {
    name: 'kawapress:search-index',
    configResolved(config) {
      sourceRoot = resolve(config.root, options.srcDir)
    },
    resolveId(id) {
      if (id === SEARCH_INDEX_MODULE_ID) {
        return RESOLVED_MODULE_ID
      }
      if (id.startsWith(INDEX_MODULE_PREFIX)) {
        const resolvedId = `\0${id}`
        resolvedIndexModules.add(resolvedId)
        return resolvedId
      }
    },
    async load(id) {
      if (id === RESOLVED_MODULE_ID) {
        const loaders = localeIndexes.map((locale) => {
          const indexId = `${INDEX_MODULE_PREFIX}${encodeURIComponent(locale)}?v=${indexVersion}`
          return `${JSON.stringify(locale)}: () => import(${JSON.stringify(indexId)})`
        })
        return `export const searchIndexLoaders = {${loaders.join(',')}}`
      }
      if (!id.startsWith(RESOLVED_INDEX_MODULE_PREFIX)) {
        return
      }

      const locale = decodeURIComponent(id
        .slice(RESOLVED_INDEX_MODULE_PREFIX.length)
        .replace(/\?.*$/, ''))
      const indexes = await getIndexes()
      const serializedIndex = indexes[locale] ?? JSON.stringify(createSearchIndex())
      return `export default ${stringifyJson(serializedIndex, {
        label: `search index for locale ${JSON.stringify(locale)}`,
        path: 'searchIndex',
      })}`
    },
    handleHotUpdate(context) {
      if (!isMarkdownFile(context.file, sourceRoot)) {
        return
      }

      cachedIndexes = undefined
      indexVersion++
      const modules = [
        context.server.moduleGraph.getModuleById(RESOLVED_MODULE_ID),
        ...[...resolvedIndexModules].map(id => (
          context.server.moduleGraph.getModuleById(id)
        )),
      ].filter(module => module !== undefined)

      for (const module of modules) {
        context.server.moduleGraph.invalidateModule(module)
      }
      return [...new Set([...context.modules, ...modules])]
    },
  }
}

export async function loadSearchIndexes(
  sourceRoot: string,
  locales: string[],
  options: LoadSearchIndexesOptions = {},
): Promise<Record<string, string>> {
  const localeIndexes = Object.fromEntries(locales.map(locale => (
    [locale, createSearchIndex()]
  )))
  const files = await findMarkdownFiles(sourceRoot)

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    const route = markdownFileToRoutePath(file, sourceRoot)
    const locale = getLocaleIndex(route, locales)
    const index = localeIndexes[locale]
    if (index) {
      index.addAll(createSearchDocuments(
        source,
        route,
        {
          language: options.localeLanguages?.[locale],
          localeIndex: locale,
          callouts: options.callouts,
        },
      ))
    }
  }

  return Object.fromEntries(Object.entries(localeIndexes).map(([locale, index]) => (
    [locale, JSON.stringify(index)]
  )))
}

export function createSearchDocuments(
  source: string,
  route: string,
  options: CreateSearchDocumentsOptions = {},
): SearchDocument[] {
  const env: SearchMarkdownEnv = {}
  const markdown = getSearchMarkdown(options.callouts)
  const tokens = markdown.parse(source, env)
  const alertLabels = resolveGitHubAlertLabels(
    options.callouts?.githubAlerts,
    options.localeIndex ?? 'root',
    options.language ?? 'en',
  )
  if (env.frontmatter?.search === false) {
    return []
  }

  const pageTitle = typeof env.frontmatter?.title === 'string'
    ? env.frontmatter.title
    : undefined
  const documents: SearchDocument[] = []
  const headingTitles: string[] = []
  let section: MutableSearchSection | undefined
  let headingCount = 0

  function ensureSection(): MutableSearchSection | undefined {
    if (!section && pageTitle) {
      section = {
        id: route,
        title: pageTitle,
        titles: [],
        text: [],
      }
    }
    return section
  }

  function finishSection(): void {
    if (!section) {
      return
    }
    const text = normalizeText(section.text.join(' '))
    documents.push({
      id: section.id,
      title: section.title,
      titles: section.titles,
      text,
    })
    section = undefined
  }

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    if (token.type === 'heading_open') {
      finishSection()
      const inline = tokens[index + 1]
      const title = inline ? getInlineText(inline) : ''
      const level = Number.parseInt(token.tag.slice(1), 10)
      if (!title || !Number.isInteger(level)) {
        continue
      }

      headingCount++
      headingTitles.length = Math.max(0, level - 1)
      const parentTitles = headingTitles.filter(Boolean)
      if (parentTitles.length === 0 && level > 1 && pageTitle) {
        parentTitles.push(pageTitle)
      }
      headingTitles[level - 1] = title
      const slug = token.attrGet('id')
      section = {
        id: headingCount === 1 && level === 1
          && !documents.some(document => document.id === route)
          ? route
          : slug ? `${route}#${slug}` : route,
        title,
        titles: parentTitles,
        text: [],
      }
      index += 2
      continue
    }

    const text = getTokenText(token, markdown, env, alertLabels)
    if (text) {
      ensureSection()?.text.push(text)
    }
  }

  finishSection()
  return documents
}

function getInlineText(token: Token): string {
  return normalizeText(getInlineRawText(token))
}

function getInlineRawText(token: Token): string {
  return (token.children ?? [])
    .filter(child => child.type === 'text'
      || child.type === 'code_inline'
      || child.type === 'softbreak'
      || child.type === 'hardbreak')
    .map(child => child.type === 'softbreak' || child.type === 'hardbreak'
      ? '\n'
      : child.content)
    .join('')
}

function getTokenText(
  token: Token,
  markdown: MarkdownExit,
  env: SearchMarkdownEnv,
  alertLabels: SearchGitHubAlertLabels | undefined,
): string {
  if (token.type === 'alert_title') {
    return alertLabels?.[token.markup.toLowerCase() as SearchGitHubAlertType] ?? ''
  }
  if (token.type.startsWith('container_') && token.type.endsWith('_open')) {
    const type = token.type.slice('container_'.length, -'_open'.length)
    const customTitle = token.info.trim().slice(type.length).trim()
    return customTitle ? getInlineSourceText(customTitle, markdown, env) : ''
  }
  if (token.type === 'inline') {
    return normalizeText(getInlineRawText(token))
  }
  if (token.type === 'fence' || token.type === 'code_block') {
    return token.content
  }
  return ''
}

function getInlineSourceText(
  source: string,
  markdown: MarkdownExit,
  env: SearchMarkdownEnv,
): string {
  const inline = markdown.parseInline(source, {
    references: env.references,
  })[0]
  return inline ? getInlineText(inline) : ''
}

function resolveGitHubAlertLabels(
  options: SearchCalloutOptions['githubAlerts'],
  localeIndex: string,
  language: string,
): SearchGitHubAlertLabels | undefined {
  if (!options) {
    return undefined
  }
  const builtIn = language.toLowerCase().startsWith('zh')
    ? DEFAULT_GITHUB_ALERT_LABELS.zh
    : DEFAULT_GITHUB_ALERT_LABELS.en
  if (options === true) {
    return builtIn
  }
  return {
    ...builtIn,
    ...options.labels,
    ...options.localeLabels?.[localeIndex],
  }
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

async function findMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries
    .sort(compareEntries)
    .filter(entry => !shouldIgnore(entry))
    .map(async (entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        return findMarkdownFiles(path)
      }
      return entry.isFile() && entry.name.endsWith('.md') ? [path] : []
    }))
  return files.flat()
}

function markdownFileToRoutePath(file: string, sourceRoot: string): string {
  const route = relative(sourceRoot, file)
    .split(sep)
    .join('/')
    .replace(/\.md$/, '')
  if (route === 'index') {
    return '/'
  }
  return route.endsWith('/index')
    ? `/${route.slice(0, -'/index'.length)}`
    : `/${route}`
}

function getLocaleIndex(route: string, locales: string[]): string {
  const locale = locales
    .filter(item => item !== 'root')
    .sort((left, right) => right.length - left.length)
    .find((item) => {
      const prefix = `/${item}`
      return route === prefix || route.startsWith(`${prefix}/`)
    })
  return locale ?? 'root'
}

function isMarkdownFile(file: string, sourceRoot: string): boolean {
  const relativePath = relative(sourceRoot, file)
  return file.endsWith('.md')
    && !isAbsolute(relativePath)
    && relativePath !== '..'
    && !relativePath.startsWith(`..${sep}`)
}

function compareEntries(a: Dirent, b: Dirent): number {
  return a.name.localeCompare(b.name)
}

function shouldIgnore(entry: Dirent): boolean {
  return entry.name.startsWith('.')
    || (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name))
}
