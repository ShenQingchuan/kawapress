import type { MarkdownExit, Token } from 'markdown-exit'
import type { PageSummary } from '../core/page-manifest'
import { frontmatterPlugin } from '@mdit-vue/plugin-frontmatter'
import { attrs as attrsPlugin } from '@mdit/plugin-attrs'
import { createMarkdownExit } from 'markdown-exit'
import { resolvePageMetadata } from '../core/page-metadata'
import { installJsonFrontmatterCompatibility } from './frontmatter-compat'
import { useMarkdownItPlugin } from './markdown-it-compat'

export interface PageSummaryReader {
  /**
   * Reads the summary of `source`. `file` is only the cache key, so a file that
   * keeps its content keeps its summary between dev requests.
   */
  read: (source: string, file: string) => PageSummary
}

interface SummaryEnv {
  frontmatter?: Record<string, unknown>
}

/** Inline token types whose content becomes part of a heading title. */
const HEADING_TITLE_TOKEN_TYPES = new Set(['text', 'emoji', 'code_inline'])

/**
 * Reads route summaries without running the Markdown pipeline, so listing the
 * site never renders pages: no Shiki, no Twoslash, no MathJax and no plugin
 * `pageData()` handler runs here.
 */
export function createPageSummaryReader(): PageSummaryReader {
  const md = createSummaryMarkdown()
  const cache = new Map<string, { source: string, summary: PageSummary }>()

  return {
    read(source, file) {
      const cached = cache.get(file)
      if (cached?.source === source) {
        return cached.summary
      }

      const summary = summarizeMarkdown(md, source)
      cache.set(file, { source, summary })
      return summary
    },
  }
}

/**
 * A parser that only needs to produce tokens. It carries the two rules that
 * decide what an author sees as a heading: frontmatter detection and the
 * heading `{#custom-id}` suffix.
 */
function createSummaryMarkdown(): MarkdownExit {
  const md = createMarkdownExit({ html: true })
  useMarkdownItPlugin(md, frontmatterPlugin, { renderExcerpt: false })
  installJsonFrontmatterCompatibility(md)
  useMarkdownItPlugin(md, attrsPlugin, {
    allowed: ['id'],
    rule: ['heading'],
  })
  return md
}

function summarizeMarkdown(md: MarkdownExit, source: string): PageSummary {
  const env: SummaryEnv = {}
  const heading = firstLevelOneHeading(md.parse(source, env))
  const frontmatter = env.frontmatter ?? {}
  // Same title rule as the full pipeline, so both can never disagree.
  const { title } = resolvePageMetadata(
    frontmatter,
    heading === undefined ? [] : [{ level: 1, title: heading }],
  )
  const layout = typeof frontmatter.layout === 'string'
    ? frontmatter.layout
    : undefined

  return {
    title,
    ...(layout === undefined ? {} : { layout }),
  }
}

/**
 * The first top-level h1 of the page, as plain text. Headings nested in a
 * quote or a list are not page titles, which mirrors the heading rule of the
 * full pipeline.
 */
function firstLevelOneHeading(tokens: Token[]): string | undefined {
  for (const [index, token] of tokens.entries()) {
    if (token.type !== 'heading_open' || token.tag !== 'h1' || token.level !== 0) {
      continue
    }
    const inline = tokens[index + 1]
    return inline?.type === 'inline'
      ? resolveHeadingText(inline)
      : undefined
  }
}

/**
 * Joins the text an author wrote: inline code, emphasis and links keep their
 * content while their markup disappears. The permalink that a rendered heading
 * carries is not part of the title.
 */
function resolveHeadingText(token: Token): string {
  return (token.children ?? [])
    .filter(child =>
      HEADING_TITLE_TOKEN_TYPES.has(child.type)
      && !child.meta?.isPermalinkSymbol,
    )
    .map(child => child.content)
    .join('')
    .trim()
}
