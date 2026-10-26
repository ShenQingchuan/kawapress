import type { Plugin, ViteDevServer } from 'vite'
import type { MarkdownPageLoader } from '../../../compiler/page-loader'
import type { DeadLink, ResolvedDeadLinkConfig } from '../../../core/dead-links'
import type { PageRouteIndex } from './pages'
import { markdownFileToSourcePath } from '../../../compiler/page-loader'
import { findPageDeadLinks, formatDeadLink } from '../../../core/dead-links'
import { markdownPagePathToRoutePath } from '../../../core/markdown-route'

export interface DevDeadLinksOptions {
  pageLoader: MarkdownPageLoader
  pageRoutes: PageRouteIndex
  deadLinks: ResolvedDeadLinkConfig | false
}

/**
 * Warn about dead links while editing. Dev only checks that a page exists and
 * that same-page anchors resolve, so a half-finished site keeps running.
 */
export function devDeadLinksPlugin(options: DevDeadLinksOptions): Plugin {
  let server: ViteDevServer | undefined
  const reported = new Map<string, Set<string>>()

  return {
    name: 'kawapress:dev-dead-links',
    apply: 'serve',
    configureServer(devServer) {
      server = devServer
    },
    async transform(_code, id) {
      if (!server || options.deadLinks === false) {
        return
      }
      const [file, query] = id.split('?', 2)
      if (query || !file.endsWith('.md')) {
        return
      }

      const route = markdownPagePathToRoutePath(
        markdownFileToSourcePath(file, options.pageLoader.sourceRoot),
      )
      const page = options.pageLoader.registry.get(route)
      if (!page) {
        return
      }

      const deadLinks = findPageDeadLinks(
        page,
        {
          routes: await options.pageRoutes.routes(),
          headings: new Map([[route, page.headings]]),
          publicFiles: [],
        },
        options.deadLinks.ignore,
      ).filter(isDevDeadLink)

      const messages = new Set(deadLinks.map(formatDeadLink))
      const previous = reported.get(id)
      for (const message of messages) {
        if (!previous?.has(message)) {
          server.config.logger.warn(`KawaPress: dead link ${message}`)
        }
      }
      reported.set(id, messages)
    },
  }
}

/** `missing-file` and cross-page anchors are build-only checks. */
function isDevDeadLink(link: DeadLink): boolean {
  return link.reason === 'missing-page'
    || (link.reason === 'missing-anchor' && link.target.startsWith('#'))
}
