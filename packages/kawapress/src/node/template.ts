export interface HtmlTemplateOptions {
  head: string
  appHtml: string
  clientEntryUrl: string
  cssUrls?: string[]
}

export function renderHtmlTemplate(options: HtmlTemplateOptions): string {
  const cssLinks = (options.cssUrls ?? [])
    .map(href => `<link rel="stylesheet" href="${href}">`)
    .join('\n')

  return `<!DOCTYPE html>
<html>
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
