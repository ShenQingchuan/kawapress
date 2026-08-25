import type { InjectionKey } from 'vue'
import { inject } from 'vue'

export const nagiDocScrollKey: InjectionKey<() => HTMLElement | null> = Symbol('nagi-doc-scroll')

export function useDocScrollElement(): () => HTMLElement | null {
  return inject(nagiDocScrollKey, () => {
    if (typeof document === 'undefined') {
      return null
    }
    return document.querySelector<HTMLElement>('.nagi-main--doc .nagi-main__scroll .os-viewport')
      ?? document.querySelector<HTMLElement>('.nagi-main--doc .nagi-main__scroll')
  })
}
