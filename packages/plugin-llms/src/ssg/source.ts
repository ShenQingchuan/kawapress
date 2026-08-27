import type { MarkdownExit, Token } from 'markdown-exit'
import { normalizeFrontmatterSource } from 'kawapress'
import { SSG_MD_RAW_COMPONENT } from '../constants'

type LineKind = 'dynamic' | 'static' | 'sfc'

interface SourcePart {
  body: string
  frontmatter: string
}

const VUE_COMPONENT_RE = /<\/?[A-Z][\w.$-]*(?=\s|\/?>)/
const VUE_INTERPOLATION_RE = /\{\{[\s\S]*?\}\}/
const VUE_LONG_DIRECTIVE_RE = /<[^>]+\sv-[\w-]+[\s=>]/
const VUE_SHORT_DIRECTIVE_RE = /<[^>]+\s[:@#][\w.-]+[\s=>]/

export function createSsgMarkdownSource(
  markdown: MarkdownExit,
  source: string,
): string {
  const normalized = normalizeFrontmatterSource(
    source.replaceAll('\r\n', '\n').replaceAll('\r', '\n'),
  )
  const { frontmatter, body } = splitFrontmatter(normalized)
  if (!body) {
    return normalized
  }

  const tokens = markdown.parse(body, {})
  const lines = splitLines(body)
  const kinds: LineKind[] = lines.map(() => 'static')

  for (const token of rootBlockTokens(tokens)) {
    const [start, mappedEnd] = token.map!
    const end = token.type.startsWith('container_')
      && lines[mappedEnd]?.trim() === ':::'
      ? mappedEnd + 1
      : mappedEnd
    const block = lines.slice(start, end).join('')
    const kind: LineKind = isSfcBlock(block)
      ? 'sfc'
      : isDynamicBlock(token, block) ? 'dynamic' : 'static'
    for (let index = start; index < Math.min(end, kinds.length); index++) {
      kinds[index] = mergeLineKind(kinds[index], kind)
    }
  }

  const output: string[] = [frontmatter]
  let start = 0
  while (start < lines.length) {
    const kind = kinds[start]
    let end = start + 1
    while (end < lines.length && kinds[end] === kind) {
      end++
    }
    const content = lines.slice(start, end).join('')
    output.push(kind === 'static' ? renderRawSegment(content) : content)
    start = end
  }
  return output.join('')
}

function splitFrontmatter(source: string): SourcePart {
  const lines = splitLines(source)
  if (lines[0]?.replace(/^\uFEFF/, '').trim() !== '---') {
    return { frontmatter: '', body: source }
  }
  const end = lines.findIndex((line, index) => (
    index > 0 && line.trim() === '---'
  ))
  if (end < 0) {
    return { frontmatter: '', body: source }
  }
  const frontmatter = lines.slice(0, end + 1).join('')
  return {
    frontmatter,
    body: source.slice(frontmatter.length),
  }
}

function splitLines(source: string): string[] {
  if (!source) {
    return []
  }
  return source.match(/.*(?:\n|$)/g)?.filter(Boolean) ?? []
}

function rootBlockTokens(tokens: Token[]): Token[] {
  const seen = new Set<string>()
  return tokens.filter((token) => {
    if (token.level !== 0 || !token.map) {
      return false
    }
    const key = `${token.map[0]}:${token.map[1]}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function isSfcBlock(source: string): boolean {
  const start = source.trimStart().toLowerCase()
  return isOpeningTag(start, 'script') || isOpeningTag(start, 'style')
}

function isOpeningTag(source: string, tag: string): boolean {
  const prefix = `<${tag}`
  if (!source.startsWith(prefix)) {
    return false
  }
  const next = source[prefix.length]
  return next === '>' || next === ' ' || next === '\t' || next === '\n'
}

function isDynamicBlock(token: Token, source: string): boolean {
  if (token.type === 'fence' || token.type === 'code_block') {
    return false
  }
  return VUE_COMPONENT_RE.test(source)
    || VUE_INTERPOLATION_RE.test(source)
    || VUE_LONG_DIRECTIVE_RE.test(source)
    || VUE_SHORT_DIRECTIVE_RE.test(source)
}

function mergeLineKind(current: LineKind, incoming: LineKind): LineKind {
  if (current === 'sfc' || incoming === 'sfc') {
    return 'sfc'
  }
  if (current === 'dynamic' || incoming === 'dynamic') {
    return 'dynamic'
  }
  return 'static'
}

function renderRawSegment(content: string): string {
  if (!content) {
    return ''
  }
  const expression = escapeSingleQuotedAttribute(JSON.stringify(content))
  return `\n<${SSG_MD_RAW_COMPONENT} :content='${expression}' />\n`
}

function escapeSingleQuotedAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('\'', '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
