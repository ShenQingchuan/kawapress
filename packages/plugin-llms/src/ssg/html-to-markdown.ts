import { NodeHtmlMarkdown } from 'node-html-markdown'
import { parse } from 'node-html-parser'
import {
  SSG_MD_RAW_ATTRIBUTE,
  SSG_MD_ROOT_ATTRIBUTE,
} from '../constants'

const converter = new NodeHtmlMarkdown({
  bulletMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  keepDataImages: true,
  maxConsecutiveNewlines: 20,
  useInlineLinks: false,
}, {
  div: ({ node, base }) => node.hasAttribute(SSG_MD_RAW_ATTRIBUTE)
    ? {
        content: node.textContent,
        noEscape: true,
        preserveWhitespace: true,
        recurse: false,
      }
    : base ?? { surroundingNewlines: 2 },
})

export function renderHtmlToMarkdown(html: string): string {
  const document = parse(html)
  const root = document.querySelector(`[${SSG_MD_ROOT_ATTRIBUTE}]`)
  if (!root) {
    throw new Error(
      `KawaPress LLMS: rendered page did not contain [${SSG_MD_ROOT_ATTRIBUTE}].`,
    )
  }

  for (const anchor of root.querySelectorAll('a.header-anchor')) {
    anchor.remove()
  }
  const markdown = converter.translate(root.innerHTML)
  return normalizeMarkdown(markdown)
}

export function normalizeMarkdown(markdown: string): string {
  const normalized = markdown
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .trim()
  return normalized ? `${normalized}\n` : ''
}
