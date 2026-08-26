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

  const serializedHtmlAttrs = options.htmlAttrs?.trim()
  const htmlAttrs = serializedHtmlAttrs ? ` ${serializedHtmlAttrs}` : ''

  return `<!DOCTYPE html>
<html${htmlAttrs}>
  <head>
    ${options.head}
    ${cssLinks}
  </head>
  <body>
    <div id="app">${options.appHtml}</div>
    <script type="module" src="${options.clientEntryUrl}"></script>
  </body>
</html>`
}
