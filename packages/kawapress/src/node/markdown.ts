import type { MarkdownExit } from 'markdown-exit'
import type { PageData, PageHeader } from '../site'
import type { GeneratorPluginRunner } from './plugin-runner'
import { componentPlugin } from '@mdit-vue/plugin-component'
import { frontmatterPlugin } from '@mdit-vue/plugin-frontmatter'
import { headersPlugin } from '@mdit-vue/plugin-headers'
import { sfcPlugin } from '@mdit-vue/plugin-sfc'
import { createMarkdownExit } from 'markdown-exit'
import anchorPlugin from 'markdown-it-anchor'
import { stringifyJsonForScript } from '../json'

interface MarkdownEnv {
  frontmatter?: Record<string, unknown>
  headers?: PageHeader[]
  sfcBlocks?: {
    scripts: { content: string }[]
    styles: { content: string }[]
    customBlocks: { content: string }[]
  }
}

export interface CompiledPage {
  code: string
  pageData: PageData
}

export interface MarkdownCompilerOptions {
  pluginRunner?: GeneratorPluginRunner
}

export async function createMarkdownCompiler(options: MarkdownCompilerOptions = {}): Promise<MarkdownExit> {
  const md = createMarkdownExit({ html: true })
  // @mdit-vue plugins are typed against markdown-it; runtime-compatible with markdown-exit
  md.use(frontmatterPlugin as any)
  md.use(sfcPlugin as any)
  md.use(componentPlugin as any)
  md.use(anchorPlugin as any, {
    level: [1, 2, 3, 4, 5, 6],
    permalink: anchorPlugin.permalink.linkInsideHeader({
      class: 'header-anchor',
      placement: 'after',
      space: true,
      symbol: '#',
    }),
  })
  // include h1: page title inference reads it; outline rendering filters to h2+ itself
  md.use(headersPlugin as any, { level: [1, 2, 3] })

  await options.pluginRunner?.runMarkdown(md)
  return md
}

export interface ParsedMarkdown {
  html: string
  env: MarkdownEnv
  pageData: PageData
}

export function parseMarkdown(md: MarkdownExit, src: string, path: string): ParsedMarkdown {
  const env: MarkdownEnv = {}
  // markdown-exit's renderAsync drops env writes from core-ruler plugins (@mdit-vue); sync render works
  const html = md.render(src, env)

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

export function compileMarkdownToVue(
  md: MarkdownExit,
  src: string,
  path: string,
): CompiledPage {
  const { html, env, pageData } = parseMarkdown(md, src, path)
  return { code: assembleVueSfc(html, env, pageData), pageData }
}

const scriptSetupRE = /<\s*script[^>]*\ssetup\b/
const scriptLangRE = /\slang\s*=\s*["']([^"']+)["']/
const scriptEndRE = /<\/script>/

export function assembleVueSfc(html: string, env: MarkdownEnv, pageData: PageData): string {
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
    `<template>${html}</template>`,
    ...scripts,
    ...(env.sfcBlocks?.styles.map(block => block.content) ?? []),
    ...(env.sfcBlocks?.customBlocks.map(block => block.content) ?? []),
  ].join('\n')
}
