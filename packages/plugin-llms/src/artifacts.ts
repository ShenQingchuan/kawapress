import type { LocaleConfig } from 'kawapress'
import type { LlmsPage, LlmsPluginOptions } from './types'
import { normalizeMarkdown } from './ssg/html-to-markdown'

export interface RenderedPage {
  routePath: string
  sourcePath: string
  pageData: LlmsPage['pageData']
  markdown: string
}

export interface LlmsSiteContext {
  base: string
  title: string
  locales: Record<string, LocaleConfig>
}

export async function createLlmsArtifacts(
  renderedPages: readonly RenderedPage[],
  site: LlmsSiteContext,
  options: LlmsPluginOptions,
): Promise<Map<string, string>> {
  const output = new Map<string, string>()
  const enabledPages = renderedPages
    .filter(page => page.pageData.frontmatter.llms !== false)
    .map(page => enrichPage(page, site))

  for (const page of enabledPages) {
    output.set(
      page.outputPath,
      injectPageHint(page.markdown, page, site),
    )
  }

  for (const [locale, localeConfig] of localeEntries(site.locales)) {
    const pages = enabledPages
      .filter(page => page.locale === locale)
      .sort(comparePages)
    const title = localeConfig.title ?? site.title
    const description = resolveDescription(options.description, locale)
    const publicPages = pages.map<LlmsPage>(page => ({
      routePath: page.routePath,
      sourcePath: page.sourcePath,
      title: page.pageData.title,
      description: page.description,
      markdownUrl: page.markdownUrl,
      pageData: page.pageData,
    }))
    const defaultContent = renderLlmsTxt(title, description, publicPages)
    const customized = await options.llmsTxt?.({
      locale,
      lang: localeConfig.lang ?? 'en',
      title,
      pages: publicPages,
      defaultContent,
      ...(description === undefined ? {} : { description }),
    })

    output.set(
      localeOutputPath(locale, 'llms.txt'),
      normalizeMarkdown(customized ?? defaultContent),
    )
    output.set(
      localeOutputPath(locale, 'llms-full.txt'),
      renderLlmsFull(title, description, pages),
    )
  }

  return output
}

interface EnrichedPage extends RenderedPage {
  description?: string
  locale: string
  markdownUrl: string
  outputPath: string
  order: number
}

function enrichPage(page: RenderedPage, site: LlmsSiteContext): EnrichedPage {
  const locale = localeForRoute(page.routePath, site.locales)
  const description = typeof page.pageData.frontmatter.llmsTxt === 'string'
    ? page.pageData.frontmatter.llmsTxt
    : typeof page.pageData.frontmatter.description === 'string'
      ? page.pageData.frontmatter.description
      : undefined
  const order = typeof page.pageData.frontmatter.order === 'number'
    ? page.pageData.frontmatter.order
    : Number.POSITIVE_INFINITY
  const outputPath = routeToMarkdownPath(page.routePath, locale)

  return {
    ...page,
    description,
    locale,
    markdownUrl: withBase(`/${outputPath}`, site.base),
    order,
    outputPath,
  }
}

function renderLlmsTxt(
  title: string,
  description: string | undefined,
  pages: readonly LlmsPage[],
): string {
  const lines = [`# ${title}`]
  if (description) {
    lines.push('', `> ${description}`)
  }
  if (pages.length > 0) {
    lines.push('', '## Docs', '')
    for (const page of pages) {
      const summary = page.description ? `: ${page.description}` : ''
      lines.push(`- [${page.title}](${page.markdownUrl})${summary}`)
    }
  }
  return `${lines.join('\n')}\n`
}

function renderLlmsFull(
  title: string,
  description: string | undefined,
  pages: readonly EnrichedPage[],
): string {
  const lines = [`# ${title}`]
  if (description) {
    lines.push('', `> ${description}`)
  }
  for (const page of pages) {
    lines.push(
      '',
      '---',
      '',
      `<!-- Source: ${page.markdownUrl} -->`,
      '',
      page.markdown.trim(),
    )
  }
  return normalizeMarkdown(lines.join('\n'))
}

function injectPageHint(
  markdown: string,
  page: EnrichedPage,
  site: LlmsSiteContext,
): string {
  const locale = site.locales[page.locale]
  const llmsUrl = withBase(
    `/${localeOutputPath(page.locale, 'llms.txt')}`,
    site.base,
  )
  const fullUrl = withBase(
    `/${localeOutputPath(page.locale, 'llms-full.txt')}`,
    site.base,
  )
  const chinese = /^zh(?:-|$)/i.test(locale?.lang ?? '')
  const hint = chinese
    ? `> 本页是 ${page.pageData.title} 的 Markdown 正文。站点索引见 [llms.txt](${llmsUrl})，完整文档见 [llms-full.txt](${fullUrl})。`
    : `> This is the Markdown source for ${page.pageData.title}. See [llms.txt](${llmsUrl}) for the site index or [llms-full.txt](${fullUrl}) for the complete documentation.`

  const heading = markdown.match(/^# .*(?:\n|$)/)
  if (!heading) {
    return normalizeMarkdown(`${hint}\n\n${markdown}`)
  }
  return normalizeMarkdown(
    `${heading[0].trimEnd()}\n\n${hint}\n\n${markdown.slice(heading[0].length).trimStart()}`,
  )
}

function comparePages(left: EnrichedPage, right: EnrichedPage): number {
  return left.order - right.order
    || left.sourcePath.localeCompare(right.sourcePath)
}

function localeEntries(
  locales: Record<string, LocaleConfig>,
): [string, LocaleConfig][] {
  return Object.entries(locales).sort(([left], [right]) => {
    if (left === 'root') {
      return -1
    }
    if (right === 'root') {
      return 1
    }
    return left.localeCompare(right)
  })
}

function localeForRoute(
  routePath: string,
  locales: Record<string, LocaleConfig>,
): string {
  for (const locale of Object.keys(locales)) {
    if (locale !== 'root' && (
      routePath === `/${locale}`
      || routePath.startsWith(`/${locale}/`)
    )) {
      return locale
    }
  }
  return 'root'
}

function routeToMarkdownPath(routePath: string, locale: string): string {
  if (routePath === '/') {
    return 'index.md'
  }
  if (locale !== 'root' && routePath === `/${locale}`) {
    return `${locale}/index.md`
  }
  if (routePath.endsWith('/')) {
    return `${routePath.slice(1)}index.md`
  }
  return `${routePath.slice(1)}.md`
}

function localeOutputPath(locale: string, file: string): string {
  return locale === 'root' ? file : `${locale}/${file}`
}

function resolveDescription(
  description: LlmsPluginOptions['description'],
  locale: string,
): string | undefined {
  return typeof description === 'string' ? description : description?.[locale]
}

function withBase(path: string, base: string): string {
  const prefix = base === '/' ? '' : base.replace(/\/$/, '')
  return `${prefix}${path}`
}
