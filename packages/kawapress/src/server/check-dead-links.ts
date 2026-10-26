import type { MarkdownPageLoader } from '../compiler/page-loader'
import type { DeadLink, ResolvedDeadLinkConfig } from '../core/dead-links'
import type { ResolvedSiteConfig } from '../generator/config'
import { readdir } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { consola } from 'consola'
import { findDeadLinks, formatDeadLink } from '../core/dead-links'

export interface CheckDeadLinksOptions {
  root: string
  siteConfig: ResolvedSiteConfig
  pageLoader: MarkdownPageLoader
}

/**
 * Check every page after the Vite build compiled all of them, so the page
 * loader's link registry is complete.
 */
export async function checkDeadLinks(
  options: CheckDeadLinksOptions,
): Promise<DeadLink[]> {
  const { deadLinks } = options.siteConfig
  if (deadLinks === false) {
    return []
  }

  const pages = options.pageLoader.registry.pages()
  const deadLinksFound = findDeadLinks(
    pages,
    {
      routes: pages.map(page => page.route),
      headings: new Map(pages.map(page => [page.route, page.headings])),
      publicFiles: await listPublicFiles(resolve(
        options.root,
        options.siteConfig.srcDir,
        options.siteConfig.publicDir,
      )),
    },
    deadLinks.ignore,
  )
  reportDeadLinks(deadLinksFound, deadLinks)
  return deadLinksFound
}

/** Print one line per dead link and fail the build when the level is `error`. */
export function reportDeadLinks(
  deadLinks: readonly DeadLink[],
  config: ResolvedDeadLinkConfig,
): void {
  if (deadLinks.length === 0) {
    return
  }

  const lines = deadLinks.map(formatDeadLink)
  for (const line of lines) {
    if (config.level === 'error') {
      consola.error(line)
    }
    else {
      consola.warn(line)
    }
  }

  const summary = `KawaPress: found ${lines.length} dead ${lines.length === 1 ? 'link' : 'links'}.`
  if (config.level === 'warn') {
    consola.warn(summary)
    return
  }
  throw new Error(
    `${summary} Fix the links listed above, add them to \`deadLinks.ignore\` in kawapress.config.ts, or set \`deadLinks: { level: 'warn' }\` to keep building.`,
  )
}

/** Files in the public directory, as paths relative to it, for example `/logo.png`. */
export async function listPublicFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true })
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        return []
      }
      throw error
    })

  return entries
    .filter(entry => entry.isFile())
    .map(entry => `/${relative(directory, join(entry.parentPath, entry.name)).split(sep).join('/')}`)
    .sort()
}
