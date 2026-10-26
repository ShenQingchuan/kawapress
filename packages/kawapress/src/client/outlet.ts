import type { InjectionKey } from 'vue'
import type { OutletName, OutletRegistry } from '../core/outlet'
import { inject, useSSRContext } from 'vue'

/** Registry handed to the app by core once every runtime plugin has run. */
export const outletRegistryKey: InjectionKey<OutletRegistry> = Symbol('kawapress:outlet-registry')

/** Per-app mount bookkeeping. Never module-level: SSR builds one app per request. */
export const outletRenderStoreKey: InjectionKey<OutletRenderStore> = Symbol('kawapress:outlet-render-store')

/** Key on the SSR context that collects the outlets a page rendered. */
export const SSR_OUTLETS_CONTEXT_KEY = 'kawapressOutlets'

export interface OutletRenderStore {
  mount: (outlet: OutletName) => void
  unmount: (outlet: OutletName) => void
}

/**
 * Counts mounted outlets per app so a duplicated outlet warns once instead of
 * on every navigation, and stays silent on the server where every request
 * would repeat the same warning.
 */
export function createOutletRenderStore(): OutletRenderStore {
  const mountedCounts = new Map<OutletName, number>()
  const warned = new Set<OutletName>()

  return {
    mount(outlet) {
      const count = (mountedCounts.get(outlet) ?? 0) + 1
      mountedCounts.set(outlet, count)
      if (count < 2 || warned.has(outlet) || !import.meta.env.DEV || import.meta.env.SSR) {
        return
      }
      warned.add(outlet)
      console.warn(
        `[KawaPress] Outlet ${JSON.stringify(outlet)} is mounted more than once in this app. `
        + `Render each outlet once per page, otherwise every item appears twice `
        + `(duplicate DOM ids, duplicate keyboard shortcuts).`,
      )
    },
    unmount(outlet) {
      const count = (mountedCounts.get(outlet) ?? 1) - 1
      if (count > 0) {
        mountedCounts.set(outlet, count)
      }
      else {
        mountedCounts.delete(outlet)
      }
    },
  }
}

export function useOutletRegistry(context: string): OutletRegistry {
  const registry = inject(outletRegistryKey, undefined)
  if (!registry) {
    throw new Error(
      `KawaPress: ${context} was rendered outside a KawaPress app. `
      + `Render it from a theme layout, or create the app with createKawapressApp().`,
    )
  }
  return registry
}

export function useOutletRenderStore(): OutletRenderStore | undefined {
  return inject(outletRenderStoreKey, undefined)
}

/** Records the outlet in the SSR context so prerendering can report unused items. */
export function recordRenderedOutlet(outlet: OutletName): void {
  if (!import.meta.env.SSR) {
    return
  }
  const context = useSSRContext()
  if (!context) {
    return
  }
  const rendered = (context[SSR_OUTLETS_CONTEXT_KEY] ??= new Set<string>())
  rendered.add(outlet)
}

export function getRenderedOutlets(context: Record<string, unknown> | undefined): string[] {
  const rendered = context?.[SSR_OUTLETS_CONTEXT_KEY]
  return rendered instanceof Set ? [...rendered] : []
}
