import type { MarkdownExit } from 'markdown-exit'
import { normalizeFrontmatterSource } from '../core/frontmatter'

/**
 * Lets authors write frontmatter as a leading JSON object, the way VitePress
 * does. Every Markdown parser KawaPress builds for a page has to install this
 * before the frontmatter plugin reads the source.
 */
export function installJsonFrontmatterCompatibility(md: MarkdownExit): void {
  const parse = md.parse.bind(md)
  md.parse = (source, env = {}) => parse(normalizeFrontmatterSource(source), env)
}
