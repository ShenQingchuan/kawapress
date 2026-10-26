import { decodeUrlPathname } from './base'
import { markdownPagePathToRoutePath } from './markdown-route'

/** Why KawaPress treats an internal link as dead. */
export type DeadLinkReason = 'missing-page' | 'missing-anchor' | 'missing-file'

export interface DeadLink {
  /** Original href from the Markdown source, for example `./intro.md#setup`. */
  href: string
  /** Public route or public file path without the site base, including search and hash. */
  target: string
  /** Source path relative to srcDir, for example `/guide/intro.md`. */
  source: string
  /** 1-based line number of the Markdown block that contains the link. */
  line: number
  reason: DeadLinkReason
}

/** A link is skipped when the value matches its `href` or `target`. */
export type DeadLinkIgnore = string | RegExp | ((link: DeadLink) => boolean)

export interface DeadLinkConfig {
  /** `error` fails the build, `warn` only prints the report. Defaults to `error`. */
  level?: 'error' | 'warn'
  /** Links to skip. A function receives the whole {@link DeadLink}. */
  ignore?: DeadLinkIgnore[]
}

export interface ResolvedDeadLinkConfig {
  level: 'error' | 'warn'
  ignore: DeadLinkIgnore[]
}

/** One internal link written in a Markdown page. */
export interface LinkRecord {
  /** Original href from the Markdown source. */
  href: string
  /** Public route or public file path without the site base, including search and hash. */
  target: string
  /** 1-based line number in the source file. */
  line: number
}

/** Links and heading IDs of one page, as seen by the dead link checker. */
export interface PageLinks {
  /** Public route of the page, for example `/guide/intro`. */
  route: string
  /** Source path relative to srcDir, for example `/guide/intro.md`. */
  source: string
  /** Anchor IDs of every heading on the page, from h1 to h6. */
  headings: readonly string[]
  /** Internal links written in the page. */
  links: readonly LinkRecord[]
}

export interface DeadLinkSite {
  /** Public routes of every page in the site. */
  routes: Iterable<string>
  /** Heading IDs of each page, keyed by route. */
  headings: ReadonlyMap<string, readonly string[]>
  /** Files in the public directory, as paths relative to it, for example `/logo.png`. */
  publicFiles: Iterable<string>
}

const PAGE_EXTENSION_RE = /\.(?:md|html)$/i

export function findDeadLinks(
  pages: Iterable<PageLinks>,
  site: DeadLinkSite,
  ignore: readonly DeadLinkIgnore[] = [],
): DeadLink[] {
  const context = createContext(site, ignore)
  const deadLinks = [...pages].flatMap(page => checkPage(page, context))
  return deadLinks.sort(compareDeadLinks)
}

export function findPageDeadLinks(
  page: PageLinks,
  site: DeadLinkSite,
  ignore: readonly DeadLinkIgnore[] = [],
): DeadLink[] {
  return checkPage(page, createContext(site, ignore))
}

/** Format a link as `source:line  href  reason`, the report line used by build and dev. */
export function formatDeadLink(link: DeadLink): string {
  return `${link.source}:${link.line}  ${link.href}  ${link.reason}`
}

interface CheckContext {
  routes: Set<string>
  headings: Map<string, Set<string>>
  publicFiles: Set<string>
  ignore: readonly DeadLinkIgnore[]
}

function createContext(site: DeadLinkSite, ignore: readonly DeadLinkIgnore[]): CheckContext {
  return {
    routes: new Set([...site.routes].map(route => normalizeRoute(route))),
    headings: new Map(
      [...site.headings].map(([route, ids]) => [
        normalizeRoute(route),
        new Set(ids.map(decodeAnchor)),
      ]),
    ),
    publicFiles: new Set([...site.publicFiles].map(file => normalizePublicFile(file))),
    ignore,
  }
}

function checkPage(page: PageLinks, context: CheckContext): DeadLink[] {
  const deadLinks: DeadLink[] = []
  for (const link of page.links) {
    const reason = classifyLink(link.target, page.route, context)
    if (!reason) {
      continue
    }
    const deadLink: DeadLink = {
      href: link.href,
      target: link.target,
      source: page.source,
      line: link.line,
      reason,
    }
    if (!isIgnored(deadLink, context.ignore)) {
      deadLinks.push(deadLink)
    }
  }
  return deadLinks
}

function classifyLink(
  target: string,
  pageRoute: string,
  context: CheckContext,
): DeadLinkReason | undefined {
  const { pathname, hash } = splitTarget(target)

  if (!pathname) {
    return hasAnchor(pageRoute, hash, context) ? undefined : 'missing-anchor'
  }

  const decodedPath = decodeUrlPathname(pathname)
  const route = normalizeRoute(markdownPagePathToRoutePath(decodedPath))
  if (isPagePath(decodedPath) || context.routes.has(route)) {
    if (!context.routes.has(route)) {
      return 'missing-page'
    }
    return hasAnchor(route, hash, context) ? undefined : 'missing-anchor'
  }

  return context.publicFiles.has(normalizePublicFile(decodedPath))
    ? undefined
    : 'missing-file'
}

/**
 * Page links are extensionless, `.md`, `.html`, or a directory path. Everything
 * else that carries an extension points into the public directory.
 */
function isPagePath(pathname: string): boolean {
  return pathname.endsWith('/')
    || !hasExtension(pathname)
    || PAGE_EXTENSION_RE.test(pathname)
}

function hasExtension(pathname: string): boolean {
  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1)
  return lastSegment.includes('.')
}

function hasAnchor(route: string, hash: string, context: CheckContext): boolean {
  if (!hash) {
    return true
  }
  const anchors = context.headings.get(normalizeRoute(route))
  return anchors?.has(decodeAnchor(hash)) ?? false
}

function splitTarget(target: string): { pathname: string, hash: string } {
  const hashIndex = target.indexOf('#')
  const withoutHash = hashIndex < 0 ? target : target.slice(0, hashIndex)
  const searchIndex = withoutHash.indexOf('?')
  return {
    pathname: searchIndex < 0 ? withoutHash : withoutHash.slice(0, searchIndex),
    hash: hashIndex < 0 ? '' : target.slice(hashIndex + 1),
  }
}

function normalizeRoute(route: string): string {
  if (route.length <= 1 || !route.endsWith('/')) {
    return route
  }
  return route.slice(0, -1)
}

function normalizePublicFile(file: string): string {
  const decoded = decodeUrlPathname(file)
  return decoded.startsWith('/') ? decoded : `/${decoded}`
}

/** Anchors live in the URL, so `#开始` and `#%E5%BC%80%E5%A7%8B` are the same heading. */
function decodeAnchor(value: string): string {
  try {
    return decodeURIComponent(value)
  }
  catch {
    return value
  }
}

function isIgnored(link: DeadLink, ignore: readonly DeadLinkIgnore[]): boolean {
  return ignore.some((pattern) => {
    if (typeof pattern === 'string') {
      return pattern === link.href || pattern === link.target
    }
    if (pattern instanceof RegExp) {
      return matchesPattern(pattern, link.href) || matchesPattern(pattern, link.target)
    }
    return pattern(link)
  })
}

function matchesPattern(pattern: RegExp, value: string): boolean {
  // `g` and `y` flags keep state between calls, so every test starts from zero.
  pattern.lastIndex = 0
  return pattern.test(value)
}

function compareDeadLinks(a: DeadLink, b: DeadLink): number {
  return a.source.localeCompare(b.source)
    || a.line - b.line
    || a.target.localeCompare(b.target)
}
