import type { IncomingMessage, ServerResponse } from 'node:http'
import type { RunnableDevEnvironment, ViteDevServer } from 'vite'
import { isCSSRequest } from 'vite'
import { decodeUrlPathname, withBase, withoutBase } from '../core/base'
import { entryClientPath, entryServerPath } from '../generator/vite/entries'
import { toFsModuleUrl } from '../generator/vite/module-url'
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
    const url = resolveRequestPathname(req)
    const routeUrl = withoutBase(decodeUrlPathname(url), vite.config.base) ?? '/404'
    try {
      const { render } = await serverEnv.runner.import(entryServerUrl)
      const { html: appHtml, found, head, htmlAttrs } = await render(routeUrl)
      const cssUrls = collectDevCssUrls(
        serverEnv.moduleGraph.urlToModuleMap.values(),
      )
      const html = renderHtmlTemplate({
        head: `${await collectViteHeadTags(vite, url)}\n${head}`,
        appHtml,
        clientEntryUrl: withBase(entryClientUrl, vite.config.base),
        cssUrls: cssUrls.map(cssUrl => withBase(cssUrl, vite.config.base)),
        htmlAttrs,
      })
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

const VITE_HEAD_SHELL = '<html><head></head><body></body></html>'
const HEAD_CONTENT_RE = /<head>([\s\S]*)<\/head>/

/**
 * Asks Vite for the tags it injects in dev (the HMR client, plugin tags) using
 * an empty shell. The rendered page never goes through `transformIndexHtml`:
 * Vite would prefix the site base onto URLs that SSR already resolved.
 */
async function collectViteHeadTags(
  vite: ViteDevServer,
  url: string,
): Promise<string> {
  const shell = await vite.transformIndexHtml(url, VITE_HEAD_SHELL)
  return HEAD_CONTENT_RE.exec(shell)?.[1].trim() ?? ''
}

/**
 * Vite's base middleware strips the site base from `req.url` and keeps the
 * address the browser asked for in `originalUrl`. Routing starts from that
 * address so the base is removed exactly once.
 */
export function resolveRequestPathname(
  req: Pick<IncomingMessage, 'url'> & { originalUrl?: string },
): string {
  return (req.originalUrl ?? req.url ?? '/').split('?')[0].split('#')[0]
}

const CSS_AS_VALUE_RE = /[?&](?:inline|raw|url)(?:&|$)/

export function collectDevCssUrls(
  modules: Iterable<{ url: string }>,
): string[] {
  return Array.from(modules, module => module.url).filter(
    url => isCSSRequest(url) && !CSS_AS_VALUE_RE.test(url),
  )
}
