import type { Component } from 'vue'
import type { PageData, PageRouteMeta } from './site'

/** Everything a route needs about a page except the route path it is stored under. */
export type PageSummary = Omit<PageRouteMeta, 'path'>

/** A Markdown page compiled to a component, together with the page data it carries. */
export interface PageModule {
  default: Component
  __pageData?: PageData
}

/**
 * One record of the page manifest: the route summary a theme can read without
 * loading the page, plus the loader that fetches the page component on demand.
 */
export interface PageManifestEntry extends PageSummary {
  load: () => Promise<PageModule>
}

/** Every page of the site, keyed by public route path. */
export type PageManifest = Record<string, PageManifestEntry>

/**
 * Route summary of a page. The manifest stores the summary under its route
 * path, so the path itself only has to be written once.
 */
export function toPageRouteMeta(
  path: string,
  { title, layout }: PageSummary,
): PageRouteMeta {
  return layout === undefined ? { path, title } : { path, title, layout }
}
