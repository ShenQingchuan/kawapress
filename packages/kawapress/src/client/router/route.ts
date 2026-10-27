import type { PageTable } from '../../core/page-manifest'
import type { Route } from '../../core/router'
import { decodeUrlPathname } from '../../core/base'

/** Path, query and hash of a location; the delimiters stay with query and hash. */
export interface LocationParts {
  path: string
  /** Query including `?`, empty when the URL has none. */
  search: string
  /** Hash including `#`, empty when the URL has none. */
  hash: string
}

/**
 * Split a location into its parts. A percent-encoded path is decoded, because
 * the page table is keyed by the paths the site author wrote.
 */
export function parseLocation(location: string): LocationParts {
  const hashIndex = location.indexOf('#')
  const beforeHash = hashIndex === -1 ? location : location.slice(0, hashIndex)
  const hash = hashIndex === -1 ? '' : location.slice(hashIndex)
  const searchIndex = beforeHash.indexOf('?')
  const search = searchIndex === -1 ? '' : beforeHash.slice(searchIndex)
  const path = searchIndex === -1 ? beforeHash : beforeHash.slice(0, searchIndex)

  return {
    path: normalizePath(decodeUrlPathname(path)),
    search,
    hash,
  }
}

/**
 * Query object of a location, parsed like `URLSearchParams`: every value is a
 * string, and a key that appears more than once keeps all values in order.
 */
export function parseQuery(search: string): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {}
  for (const [key, value] of new URLSearchParams(search)) {
    const existing = query[key]
    if (existing === undefined) {
      query[key] = value
    }
    else if (Array.isArray(existing)) {
      existing.push(value)
    }
    else {
      query[key] = [existing, value]
    }
  }
  return query
}

/** Resolve a location against the page table, without loading anything. */
export function resolveRoute(location: string, pages: PageTable): Route {
  const { path, search, hash } = parseLocation(location)
  return {
    path,
    fullPath: `${path}${search}${hash}`,
    query: parseQuery(search),
    hash,
    found: Object.hasOwn(pages, path),
  }
}

/** Path part of a location, without query and hash. */
export function routePathOf(location: string): string {
  return parseLocation(location).path
}

/** Whether two route paths address the same page, ignoring a trailing slash. */
export function isSamePagePath(a: string, b: string): boolean {
  return normalizeTrailingSlash(a) === normalizeTrailingSlash(b)
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

function normalizeTrailingSlash(path: string): string {
  return path.length > 1 ? path.replace(/\/$/, '') : path
}
