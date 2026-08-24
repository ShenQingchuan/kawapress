import type { IncomingMessage, ServerResponse } from 'node:http'
import type { RunnableDevEnvironment, ViteDevServer } from 'vite'
import { isCSSRequest } from 'vite'
import { entryClientPath, entryServerPath } from './entries'
import { toFsModuleUrl } from './module-url'
import { renderHtmlTemplate } from './template'

const entryServerUrl = toFsModuleUrl(entryServerPath)
const entryClientUrl = toFsModuleUrl(entryClientPath)

export function createRequestHandler(
  vite: ViteDevServer,
  serverEnv: RunnableDevEnvironment,
) {
  return async function handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ) {
    const url = (req.url ?? '/').split('?')[0].split('#')[0]
    try {
      const { render } = await serverEnv.runner.import(entryServerUrl)
      const { html: appHtml, found, head, htmlAttrs } = await render(url)
      const cssUrls = collectDevCssUrls(
        serverEnv.moduleGraph.urlToModuleMap.values(),
      )
      const html = await vite.transformIndexHtml(
        url,
        renderHtmlTemplate({
          head,
          appHtml,
          clientEntryUrl: entryClientUrl,
          cssUrls,
          htmlAttrs,
        }),
      )
      res.statusCode = found ? 200 : 404
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(html)
    }
    catch (error) {
      vite.ssrFixStacktrace(error as Error)
      res.statusCode = 500
      res.end(String(error instanceof Error ? error.stack : error))
    }
  }
}

const CSS_AS_VALUE_RE = /[?&](?:inline|raw|url)(?:&|$)/

export function collectDevCssUrls(
  modules: Iterable<{ url: string }>,
): string[] {
  return Array.from(modules, module => module.url).filter(
    url => isCSSRequest(url) && !CSS_AS_VALUE_RE.test(url),
  )
}
