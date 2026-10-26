import type { InjectionKey } from 'vue'
import { inject } from 'vue'

export const nagiDocScrollKey: InjectionKey<() => HTMLElement | null> = Symbol('nagi-doc-scroll')

/**
 * The scrolling element of the doc layout. `nagi-main__scroll` is the scroll
 * area host and `nagi-os-scroll__viewport` is the element that really scrolls,
 * before and after the OverlayScrollbars enhancement.
 */
export function useDocScrollElement(): () => HTMLElement | null {
  return inject(nagiDocScrollKey, () => {
    if (typeof document === 'undefined') {
      return null
    }
    return document.querySelector<HTMLElement>('.nagi-main--doc .nagi-main__scroll .nagi-os-scroll__viewport')
      ?? document.querySelector<HTMLElement>('.nagi-main--doc .nagi-main__scroll')
  })
}
