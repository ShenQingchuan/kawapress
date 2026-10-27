import type { ShallowRef } from 'vue'
import type { Route, Router } from '../../core/router'
import type { AppRouter } from './router'
import { inject } from 'vue'

/** Injection key of the router a KawaPress app provides. */
export const routerKey: symbol = Symbol('kawapress:router')

/** Router of the current app: navigation, guards and the current route. */
export function useRouter(): Router {
  return useAppRouter()
}

/** Current route of the app, updated by every navigation. */
export function useRoute(): Readonly<ShallowRef<Route>> {
  return useAppRouter().currentRoute
}

/** Internal access used by `RouterView` and `RouterLink`. */
export function useAppRouter(): AppRouter {
  const router = inject(routerKey as unknown as InjectionKeyOf<AppRouter>, undefined)
  if (!router) {
    throw new Error(
      'KawaPress: useRoute() and useRouter() need a KawaPress app. '
      + 'Render the component from a theme layout, or create the app with createKawapressApp().',
    )
  }
  return router
}

// `routerKey` is a plain symbol so this module can be imported by the SSR build
// without pulling in extra types; this alias documents what it is used for.
type InjectionKeyOf<T> = import('vue').InjectionKey<T>
