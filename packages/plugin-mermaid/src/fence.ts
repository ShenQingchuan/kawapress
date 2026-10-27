import type { MarkdownExit, RenderRule } from 'markdown-exit'
import type { MermaidLabels } from './labels'
import { PeleError, render } from 'pele'

export type MermaidView = 'diagram' | 'code' | 'split'

const VIEWS: readonly MermaidView[] = ['diagram', 'code', 'split']
const MERMAID_INFO_RE = /^mermaid(?=\s|$)/i

type RenderRuleArgs = Parameters<RenderRule>

interface MermaidRenderEnv {
  /** Route of the page being compiled. */
  path?: string
  /** Number of diagrams already rendered on this page, for unique SVG ids. */
  kawaMermaidCount?: number
}

export interface InstallMermaidOptions {
  /** View a block starts in unless its fence names another one. */
  defaultView?: MermaidView
  /** Labels of the page being rendered, resolved once per block. */
  resolveLabels: (path: string) => MermaidLabels
  /** Tag of the page component and the module that default-exports it. */
  onDiagram?: (env: RenderRuleArgs[3]) => void
}

/**
 * Reads the fence info of a Mermaid block. Words after `mermaid` can pick the
 * starting view (`diagram`, `code` or `split`); every other word is ignored so
 * other plugins can keep their own meta on the same fence.
 */
export function parseMermaidInfo(
  info: string,
): { view?: MermaidView } | undefined {
  const trimmed = info.trim()
  if (!MERMAID_INFO_RE.test(trimmed)) {
    return undefined
  }
  const words = trimmed.slice('mermaid'.length).toLowerCase().split(/\s+/)
  const view = words.findLast((word): word is MermaidView => (
    VIEWS.includes(word as MermaidView)
  ))
  return { view }
}

/**
 * Turns every ```mermaid fence into a `KawaMermaid` page component.
 *
 * The SVG is drawn here, at build time, so the server HTML already contains the
 * diagram and the browser only has to enhance it. The highlighted source comes
 * from whatever fence renderer was installed before this one, so Shiki and the
 * code block frame keep working.
 */
export function installMermaid(
  markdown: MarkdownExit,
  options: InstallMermaidOptions,
): void {
  const renderFence = markdown.renderer.rules.fence

  markdown.renderer.rules.fence = (tokens, index, renderOptions, env, renderer) => {
    const token = tokens[index]
    const parsed = parseMermaidInfo(token.info)
    const renderOriginal = (): string | Promise<string> => renderFence
      ? renderFence(tokens, index, renderOptions, env, renderer)
      : renderer.renderToken(tokens, index, renderOptions)

    if (!parsed) {
      return renderOriginal()
    }

    const originalInfo = token.info
    token.info = 'mermaid'
    let code: string | Promise<string>
    try {
      code = renderOriginal()
    }
    catch (error) {
      token.info = originalInfo
      throw error
    }

    const renderEnv = (env ?? {}) as MermaidRenderEnv
    const wrap = (codeHtml: string): string => {
      token.info = originalInfo
      options.onDiagram?.(env)
      return renderDiagram({
        source: token.content,
        view: parsed.view ?? options.defaultView ?? 'diagram',
        labels: options.resolveLabels(renderEnv.path ?? '/'),
        codeHtml,
        idPrefix: `kawa-mermaid-${renderEnv.kawaMermaidCount = (renderEnv.kawaMermaidCount ?? 0) + 1}`,
      })
    }
    return typeof code === 'string' ? wrap(code) : code.then(wrap)
  }
}

interface DiagramParts {
  source: string
  view: MermaidView
  labels: MermaidLabels
  codeHtml: string
  idPrefix: string
}

function renderDiagram(parts: DiagramParts): string {
  const drawn = draw(parts.source, parts.idPrefix)
  const props = [
    `:source='${escapeSingleQuotedAttribute(JSON.stringify(parts.source))}'`,
    `view="${parts.view}"`,
    `:labels='${escapeSingleQuotedAttribute(JSON.stringify(parts.labels))}'`,
  ]
  if (drawn.error !== undefined) {
    props.push(`:error='${escapeSingleQuotedAttribute(JSON.stringify(drawn.error))}'`)
  }

  // `v-pre` keeps Vue away from the SVG: label text may contain `{{ }}`.
  const diagram = drawn.svg === undefined
    ? ''
    : `<template #diagram>\n<div v-pre>${drawn.svg}</div>\n</template>\n`
  return `<KawaMermaid ${props.join(' ')}>\n${diagram}<template #code>\n${parts.codeHtml}</template>\n</KawaMermaid>\n`
}

function draw(source: string, idPrefix: string): { svg?: string, error?: string } {
  try {
    return { svg: render(source, { idPrefix }).svg }
  }
  catch (error) {
    if (error instanceof PeleError) {
      return { error: error.message }
    }
    throw error
  }
}

function escapeSingleQuotedAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('\'', '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
