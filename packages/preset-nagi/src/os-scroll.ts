import type { PartialOptions } from 'overlayscrollbars'

/**
 * The scrollbars runtime is a progressive enhancement: every scroll area is a
 * plain `overflow: auto` container when the page first paints, and the
 * OverlayScrollbars runtime takes over the same elements once the browser has
 * hydrated the app.
 */
export type OverlayScrollbarsRuntime = typeof import('overlayscrollbars')

export const NAGI_SCROLLBAR_THEME = 'os-theme-nagi'

let runtimePromise: Promise<OverlayScrollbarsRuntime> | undefined

/**
 * Loads the OverlayScrollbars runtime once per page. Every scroll area shares
 * the same promise, so the browser downloads the lazy chunk a single time and
 * all instances start from the same module state (the click-scroll plugin is
 * registered here, not per instance).
 */
export function loadOverlayScrollbars(): Promise<OverlayScrollbarsRuntime> {
  runtimePromise ??= import('overlayscrollbars').then((runtime) => {
    runtime.OverlayScrollbars.plugin(runtime.ClickScrollPlugin)
    return runtime
  })
  return runtimePromise
}

/** Merges the nagi scrollbar look into the options of a single scroll area. */
export function resolveNagiScrollOptions(options: PartialOptions): PartialOptions {
  return {
    ...options,
    scrollbars: {
      ...options.scrollbars,
      theme: NAGI_SCROLLBAR_THEME,
      autoHide: 'leave',
      autoHideDelay: 0,
      clickScroll: true,
    },
  }
}
