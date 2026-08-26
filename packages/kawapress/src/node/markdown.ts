import type { MarkdownSfcBlocks } from '@mdit-vue/plugin-sfc'
import type { MarkdownExit } from 'markdown-exit'
import type { PageData, PageHeader } from '../core/site'
import type { GeneratorPluginRunner } from './plugin-runner'
import { componentPlugin } from '@mdit-vue/plugin-component'
import { frontmatterPlugin } from '@mdit-vue/plugin-frontmatter'
import { headersPlugin } from '@mdit-vue/plugin-headers'
import { sfcPlugin } from '@mdit-vue/plugin-sfc'
import { attrs as attrsPlugin } from '@mdit/plugin-attrs'
import { createMarkdownExit } from 'markdown-exit'
import anchorPlugin from 'markdown-it-anchor'
import { withBase } from '../core/base'
import { stringifyJsonForScript } from '../core/json'
import { markdownPagePathToRoutePath } from '../core/markdown-route'
import { useMarkdownItPlugin } from '../markdown-it-compat'

interface MarkdownEnv {
  path: string
  sourcePath?: string
  frontmatter?: Record<string, unknown>
  headers?: PageHeader[]
  sfcBlocks?: MarkdownSfcBlocks
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
      class: 'header-anchor',
      placement: 'after',
      space: true,
      symbol: '#',
    }),
  })
  // include h1: page title inference reads it; outline rendering filters to h2+ itself
  useMarkdownItPlugin(md, headersPlugin, { level: [1, 2, 3] })
  installLinkRenderer(md, options.base ?? '/')

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

const EXTERNAL_LINK_RE = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i

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
    else if (href && !href.startsWith('#')) {
      token.attrSet('href', normalizeInternalLink(
        href,
        markdownEnv,
        base,
        token.attrIndex('download') < 0,
      ))
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

function normalizeInternalLink(
  href: string,
  env: MarkdownEnv,
  base: string,
  normalizePage: boolean,
): string {
  const sourcePath = env.sourcePath ?? inferMarkdownSourcePath(env.path)
  const encodedSourcePath = sourcePath
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')
  const resolved = new URL(href, `https://kawapress.invalid${encodedSourcePath}`)
  const pathname = decodeURI(normalizePage
    ? markdownPagePathToRoutePath(resolved.pathname)
    : resolved.pathname)
  return withBase(`${pathname}${resolved.search}${resolved.hash}`, base)
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
  const env: MarkdownEnv = { path, sourcePath }
  const html = await md.renderAsync(src, env)

  const frontmatter = env.frontmatter ?? {}
  const headers = env.headers ?? []
  const pageData: PageData = {
    path,
    title: (frontmatter.title as string | undefined) ?? headers.find(h => h.level === 1)?.title ?? '',
    frontmatter,
    headers,
  }
  return { html, env, pageData }
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
