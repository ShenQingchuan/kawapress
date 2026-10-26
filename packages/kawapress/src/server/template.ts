import { KAWA_DEFAULT_TOKENS, KAWA_LAYER_ORDER } from '../core/tokens'

export interface HtmlTemplateOptions {
  head: string
  appHtml: string
  clientEntryUrl: string
  cssUrls?: string[]
  htmlAttrs?: string
}

export function renderHtmlTemplate(options: HtmlTemplateOptions): string {
  const cssLinks = (options.cssUrls ?? [])
    .map(href => `<link rel="stylesheet" href="${href}">`)
    .join('\n')
  // Layer order and tokens lead the head in dev and build alike, so plugin and
  // theme styles resolve the same way before any stylesheet loads.
  const kawaStyles = [
    `<style id="kawa-layers">${KAWA_LAYER_ORDER}</style>`,
    `<style id="kawa-tokens">${KAWA_DEFAULT_TOKENS}</style>`,
  ].join('\n')

  const serializedHtmlAttrs = options.htmlAttrs?.trim()
  const htmlAttrs = serializedHtmlAttrs ? ` ${serializedHtmlAttrs}` : ''

  return `<!DOCTYPE html>
<html${htmlAttrs}>
  <head>
    ${kawaStyles}
    ${options.head}
    ${cssLinks}
  </head>
  <body>
    <div id="app">${options.appHtml}</div>
    <script type="module" src="${options.clientEntryUrl}"></script>
  </body>
</html>`
}
