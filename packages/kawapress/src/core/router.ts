import type { ShallowRef } from 'vue'

/**
 * The route the app currently shows. A documentation site only needs a lookup
 * from a path to a page, so the route is plain data: no matcher, no params, no
 * nested records.
 */
export interface Route {
  /** Public route path without the site base, for example `/guide/intro`. */
  readonly path: string
  /** `path` plus query and hash, for example `/guide/intro?from=nav#top`. */
  readonly fullPath: string
  /** Parsed query, `URLSearchParams` style: a repeated key becomes an array. */
  readonly query: Readonly<Record<string, string | string[]>>
  /** Hash including the leading `#`, or an empty string. */
  readonly hash: string
  /** Whether the page table has a page for `path`. */
  readonly found: boolean
}

/**
 * Runs before a navigation commits. Returning `false` cancels it; returning
 * nothing (or `true`) lets it through. There is no redirect: a guard that wants
 * another URL calls `router.push()` itself.
 */
export type RouteGuard = (
  to: Route,
  from: Route,
) => void | boolean | Promise<void | boolean>

/** Runs after a navigation committed. */
export type RouteHook = (to: Route, from: Route) => void

/** Navigation API of a KawaPress site, a small subset of Vue Router's. */
export interface Router {
  /** Route the app currently shows. Read it through `useRoute()` in components. */
  readonly currentRoute: Readonly<ShallowRef<Route>>
  /** Navigates to `to` and adds a history entry. */
  push: (to: string) => Promise<void>
  /** Navigates to `to` and replaces the current history entry. */
  replace: (to: string) => Promise<void>
  /** Registers a guard; returns a function that removes it again. */
  beforeEach: (guard: RouteGuard) => () => void
  /** Registers a post-navigation hook; returns a function that removes it. */
  afterEach: (hook: RouteHook) => () => void
}
