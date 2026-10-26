import { renderNotFoundDocumentMeta } from '../core/not-found'
import { KAWA_DEFAULT_TOKENS, KAWA_LAYER_ORDER } from '../core/tokens'

export interface HtmlTemplateOptions {
  head: string
  appHtml: string
  clientEntryUrl: string
  cssUrls?: string[]
  /** Page chunk JS, preloaded so hydration does not wait for a waterfall. */
  modulepreloadUrls?: string[]
  htmlAttrs?: string
  /** Marks the document as the prerendered not-found page; see `core/not-found`. */
  notFoundDocument?: boolean
}

export function renderHtmlTemplate(options: HtmlTemplateOptions): string {
  const cssLinks = (options.cssUrls ?? [])
    .map(href => `<link rel="stylesheet" href="${href}">`)
    .join('\n')
  const modulepreloadLinks = (options.modulepreloadUrls ?? [])
    .map(href => `<link rel="modulepreload" href="${href}">`)
    .join('\n')
  // Layer order and tokens lead the head in dev and build alike, so plugin and
  // theme styles resolve the same way before any stylesheet loads.
  const kawaStyles = [
    `<style id="kawa-layers">${KAWA_LAYER_ORDER}</style>`,
    `<style id="kawa-tokens">${KAWA_DEFAULT_TOKENS}</style>`,
  ].join('\n')

  const serializedHtmlAttrs = options.htmlAttrs?.trim()
  const htmlAttrs = serializedHtmlAttrs ? ` ${serializedHtmlAttrs}` : ''
  const notFoundMeta = options.notFoundDocument
    ? `${renderNotFoundDocumentMeta()}\n    `
    : ''

  return `<!DOCTYPE html>
<html${htmlAttrs}>
  <head>
    ${notFoundMeta}${kawaStyles}
    ${options.head}
    ${cssLinks}
    ${modulepreloadLinks}
  </head>
  <body>
    <div id="app">${options.appHtml}</div>
    <script type="module" src="${options.clientEntryUrl}"></script>
  </body>
</html>`
}
