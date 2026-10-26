import type { MarkdownSfcBlocks } from '@mdit-vue/plugin-sfc'
import type { MarkdownExit, Token } from 'markdown-exit'
import type { LinkRecord } from '../core/dead-links'
import type { PageData, PageHeader } from '../core/site'
import type { GeneratorPluginRunner } from '../plugin/generator-runner'
import { componentPlugin } from '@mdit-vue/plugin-component'
import { frontmatterPlugin } from '@mdit-vue/plugin-frontmatter'
import { headersPlugin } from '@mdit-vue/plugin-headers'
import { sfcPlugin } from '@mdit-vue/plugin-sfc'
import { attrs as attrsPlugin } from '@mdit/plugin-attrs'
import { createMarkdownExit } from 'markdown-exit'
import anchorPlugin from 'markdown-it-anchor'
import { withBase } from '../core/base'
import { resolveHeadConfig } from '../core/head'
import { stringifyJsonForScript } from '../core/json'
import { markdownPagePathToRoutePath } from '../core/markdown-route'
import { resolvePageMetadata } from '../core/page-metadata'
import { installJsonFrontmatterCompatibility } from './frontmatter-compat'
import { useMarkdownItPlugin } from './markdown-it-compat'

/** Class of the permalink that KawaPress renders inside every heading. */
const HEADER_ANCHOR_CLASS = 'header-anchor'

interface MarkdownEnv {
  path: string
  sourcePath?: string
  frontmatter?: Record<string, unknown>
  headers?: PageHeader[]
  sfcBlocks?: MarkdownSfcBlocks
  /** Set by the LLMS plugin when it compiles Markdown for plain-text output. */
  ssgMarkdown?: boolean
  /** Set once the `doc.header` outlet has been placed after the first H1. */
  docHeaderOutletPlaced?: boolean
  /** Page body after frontmatter removal, set by the frontmatter plugin. */
  content?: string
  /** Internal links of the page, with line numbers relative to the source file. */
  links?: LinkRecord[]
  /** Anchor IDs of every heading on the page, from h1 to h6. */
  headings?: string[]
  /** 1-based line of each inline link token, filled while parsing. */
  linkLines?: Map<Token, number>
}

export interface CompiledPage {
  code: string
  pageData: PageData
}

export interface MarkdownCompilerOptions {
  base?: string
  pluginRunner?: GeneratorPluginRunner
}

export async function createMarkdownCompiler(options: MarkdownCompilerOptions = {}): Promise<MarkdownExit> {
  const md = createMarkdownExit({ html: true })
  useMarkdownItPlugin(md, frontmatterPlugin)
  installJsonFrontmatterCompatibility(md)
  useMarkdownItPlugin(md, sfcPlugin)
  installAsyncSfcRenderCompatibility(md)
  useMarkdownItPlugin(md, componentPlugin)
  useMarkdownItPlugin(md, attrsPlugin, {
    allowed: ['id'],
    rule: ['heading'],
  })
  useMarkdownItPlugin(md, anchorPlugin, {
    level: [1, 2, 3, 4, 5, 6],
    permalink: anchorPlugin.permalink.linkInsideHeader({
      class: HEADER_ANCHOR_CLASS,
      placement: 'after',
      space: true,
      symbol: '#',
    }),
  })
  // include h1: page title inference reads it; outline rendering filters to h2+ itself
  useMarkdownItPlugin(md, headersPlugin, { level: [1, 2, 3] })
  installPageLinkCollector(md)
  installLinkRenderer(md, options.base ?? '/')
  installDocHeaderOutlet(md)

  await options.pluginRunner?.runMarkdown(md)
  return md
}

function installAsyncSfcRenderCompatibility(md: MarkdownExit): void {
  const renderAsync = md.renderAsync.bind(md)
  md.renderAsync = async (source, env = {}) => {
    const sfcBlocks: MarkdownSfcBlocks = {
      template: null,
      script: null,
      scriptSetup: null,
      scripts: [],
      styles: [],
      customBlocks: [],
    }
    env.sfcBlocks = sfcBlocks
    const html = await renderAsync(source, env)
    sfcBlocks.template = {
      type: 'template',
      content: `<template>${html}</template>`,
      contentStripped: html,
      tagOpen: '<template>',
      tagClose: '</template>',
    }
    return html
  }
}

const DOC_HEADER_OUTLET = '<KawaOutlet name="doc.header" />'

/**
 * Renders the `doc.header` outlet right after the first H1 of every page, so
 * plugins can place interface pieces inside the Markdown body without the
 * theme reaching into compiled content. Pages without an H1 get no outlet.
 */
function installDocHeaderOutlet(md: MarkdownExit): void {
  const original = md.renderer.rules.heading_close

  md.renderer.rules.heading_close = (tokens, index, options, env, renderer) => {
    const rendered = original
      ? original(tokens, index, options, env, renderer)
      : renderer.renderToken(tokens, index, options)
    const renderEnv = env as MarkdownEnv

    if (
      tokens[index].tag !== 'h1'
      || typeof env !== 'object'
      || env === null
      || renderEnv.ssgMarkdown
      || renderEnv.docHeaderOutletPlaced
    ) {
      return rendered
    }

    renderEnv.docHeaderOutletPlaced = true
    return `${rendered}\n${DOC_HEADER_OUTLET}\n`
  }
}

const EXTERNAL_LINK_RE = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i

/**
 * Collect what the dead link checker needs: the line of every inline link and
 * the final anchor ID of every heading. Runs after `markdown-it-anchor`, so
 * `heading_open` tokens already carry the generated slug or a custom `{#id}`.
 */
function installPageLinkCollector(md: MarkdownExit): void {
  md.core.ruler.push('kawapress:page-links', (state) => {
    const env = state.env as MarkdownEnv
    const linkLines = new Map<Token, number>()
    const headings: string[] = []
    let blockLine = 1

    for (const token of state.tokens) {
      if (token.map) {
        blockLine = token.map[0] + 1
      }
      if (token.type === 'heading_open') {
        const id = token.attrGet('id')
        if (id) {
          headings.push(id)
        }
      }
      if (token.type !== 'inline') {
        continue
      }
      for (const child of token.children ?? []) {
        if (child.type === 'link_open') {
          linkLines.set(child, blockLine)
        }
      }
    }

    env.linkLines = linkLines
    env.headings = headings
  })
}

function installLinkRenderer(md: MarkdownExit, base: string): void {
  const defaultRender = md.renderer.rules.link_open
  md.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
    const markdownEnv = env as MarkdownEnv
    const token = tokens[index]
    const href = token.attrGet('href')

    if (href && EXTERNAL_LINK_RE.test(href)) {
      if (token.attrIndex('download') < 0) {
        if (token.attrIndex('target') < 0) {
          token.attrSet('target', '_blank')
        }
        appendRel(token, 'noreferrer')
      }
    }
    else if (href) {
      const link = resolveInternalLink(
        href,
        markdownEnv,
        base,
        token.attrIndex('download') < 0,
      )
      token.attrSet('href', link.href)
      if (!isHeaderAnchor(token)) {
        recordLink(markdownEnv, token, href, link.target)
      }
    }

    return defaultRender
      ? defaultRender(tokens, index, options, env, renderer)
      : renderer.renderToken(tokens, index, options)
  }
}

function appendRel(token: { attrGet: (name: string) => null | string, attrSet: (name: string, value: string) => void }, value: string): void {
  const rel = new Set(token.attrGet('rel')?.split(/\s+/).filter(Boolean) ?? [])
  rel.add(value)
  token.attrSet('rel', [...rel].join(' '))
}

interface ResolvedInternalLink {
  /** Value written to the page, including the site base. */
  href: string
  /** Public route or public file path without the site base, including search and hash. */
  target: string
}

function resolveInternalLink(
  href: string,
  env: MarkdownEnv,
  base: string,
  normalizePage: boolean,
): ResolvedInternalLink {
  if (href.startsWith('#')) {
    return { href, target: href }
  }

  const sourcePath = env.sourcePath ?? inferMarkdownSourcePath(env.path)
  const encodedSourcePath = sourcePath
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')
  const resolved = new URL(href, `https://kawapress.invalid${encodedSourcePath}`)
  const pathname = decodeURI(normalizePage
    ? markdownPagePathToRoutePath(resolved.pathname)
    : resolved.pathname)
  const target = `${pathname}${resolved.search}${resolved.hash}`
  return { href: withBase(target, base), target }
}

function recordLink(
  env: MarkdownEnv,
  token: Token,
  href: string,
  target: string,
): void {
  const links = (env.links ??= [])
  links.push({
    href,
    target,
    line: env.linkLines?.get(token) ?? 1,
  })
}

/** The permalink inside every heading is generated by KawaPress, not authored. */
function isHeaderAnchor(token: Token): boolean {
  const classes = token.attrGet('class')?.split(/\s+/) ?? []
  return classes.includes(HEADER_ANCHOR_CLASS)
}

function inferMarkdownSourcePath(routePath: string): string {
  return routePath === '/' ? '/index.md' : `${routePath}.md`
}

export interface ParsedMarkdown {
  html: string
  env: MarkdownEnv
  pageData: PageData
}

export async function parseMarkdown(
  md: MarkdownExit,
  src: string,
  path: string,
  sourcePath?: string,
): Promise<ParsedMarkdown> {
  const env: MarkdownEnv = { path, sourcePath, links: [], headings: [] }
  const html = await md.renderAsync(src, env)

  env.links = shiftLinksToSourceLines(src, env)
  const frontmatter = env.frontmatter ?? {}
  const headers = env.headers ?? []
  const metadata = resolvePageMetadata(frontmatter, headers)
  const head = resolveHeadConfig(frontmatter.head, {
    owner: `the frontmatter of route ${JSON.stringify(path)}`,
    path: 'head',
  })
  const pageData: PageData = {
    path,
    ...metadata,
    ...(head.length === 0 ? {} : { head }),
    frontmatter,
    headers,
  }
  return { html, env, pageData }
}

/**
 * Token line numbers start at the page body, so frontmatter lines are added back
 * to report the line the author sees in the Markdown file.
 */
function shiftLinksToSourceLines(src: string, env: MarkdownEnv): LinkRecord[] {
  const offset = countRemovedLines(src, env.content)
  return (env.links ?? []).map(link => ({ ...link, line: link.line + offset }))
}

function countRemovedLines(source: string, body: string | undefined): number {
  if (!body || !source.endsWith(body)) {
    return 0
  }
  const removed = source.slice(0, source.length - body.length)
  return (removed.match(/\n/g) ?? []).length
}

export async function compileMarkdownToVue(
  md: MarkdownExit,
  src: string,
  path: string,
  sourcePath?: string,
): Promise<CompiledPage> {
  const { html, env, pageData } = await parseMarkdown(md, src, path, sourcePath)
  return { code: assembleVueSfc(html, env, pageData), pageData }
}

const scriptSetupRE = /<\s*script[^>]*\ssetup\b/
const scriptLangRE = /\slang\s*=\s*["']([^"']+)["']/
const scriptEndRE = /<\/script>/

export function assembleVueSfc(html: string, env: MarkdownEnv, pageData: PageData): string {
  const templateHtml = html.trim()
    ? html
    : '<span data-kawapress-empty-page hidden></span>'
  const serializedPageData = stringifyJsonForScript(pageData, {
    label: `pageData for route ${JSON.stringify(pageData.path)}`,
    path: 'pageData',
  })
  const pageDataCode = `export const __pageData = ${serializedPageData}`

  const scripts = env.sfcBlocks?.scripts.map(block => block.content) ?? []
  const plainIndex = scripts.findIndex(content => !scriptSetupRE.test(content))
  if (plainIndex >= 0) {
    scripts[plainIndex] = scripts[plainIndex].replace(scriptEndRE, `${pageDataCode}\n</script>`)
  }
  else {
    const setupScript = scripts.find(content => scriptSetupRE.test(content))
    const lang = setupScript?.match(scriptLangRE)?.[1]
    const langAttribute = lang ? ` lang=${JSON.stringify(lang)}` : ''
    scripts.unshift(`<script${langAttribute}>\n${pageDataCode}\nexport default { name: ${JSON.stringify(pageData.path)} }\n</script>`)
  }

  return [
    `<template>${templateHtml}</template>`,
    ...scripts,
    ...(env.sfcBlocks?.styles.map(block => block.content) ?? []),
    ...(env.sfcBlocks?.customBlocks.map(block => block.content) ?? []),
  ].join('\n')
}
