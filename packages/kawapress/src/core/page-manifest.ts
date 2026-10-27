import type { Component } from 'vue'
import type { PageData } from './extension-points'

/** A Markdown page compiled to a Vue component, with the page data it carries. */
export interface PageModule {
  default: Component
  __pageData?: PageData
}

/**
 * What a page says about itself without being rendered: the title its author
 * wrote and the layout its frontmatter asks for. Reading it needs no Markdown
 * pipeline, so listing a site never renders a page.
 */
export interface PageSummary {
  title: string
  /** `frontmatter.layout` when it is a string. */
  layout?: string
}

/**
 * Loads one page module. A dev server and the SSR build import the Markdown
 * module; the browser of a build fetches the chunk file recorded in the page
 * table.
 */
export type PageLoader = () => Promise<PageModule>

/** Every page of the site, keyed by public route path. */
export type PageTable = Record<string, PageLoader>

/**
 * One page of a built client bundle: the content hash of its page chunk, or that
 * hash plus the JS and CSS the page needs beyond what the entry already loads.
 * The rest of the file name follows from the route, see `pageChunkFileName()`.
 */
export type BuiltPageEntry
  = | string
    | [hash: string, js: string[], css: string[]]

/** Page table of a build, keyed by public route path. Serialised into the table file. */
export type BuiltPageTable = Record<string, BuiltPageEntry>

/**
 * `<meta>` name holding the URL of the page table. The table is a file of its
 * own so that editing one page revalidates the table and that page only, and so
 * that no chunk has to know a file name that is only known after bundling.
 */
export const PAGE_TABLE_META = 'kawapress-pages'

/** File name of the page table inside the build output. */
export function pageTableFileName(hash: string): string {
  return `assets/pages-${hash}.js`
}
