import type { Ref } from 'vue'
import type { CommentsAppearance } from '../provider'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'

/**
 * Follows the appearance the theme puts on `<html>`. A `dark` or `light` class
 * wins, otherwise the operating system preference decides. Themes that switch
 * appearance only toggle that class, so a `MutationObserver` keeps the comment
 * widget in sync without any theme-specific code here.
 */
export function useCommentsAppearance(): Ref<CommentsAppearance> {
  const appearance = ref<CommentsAppearance>('light')
  let stopFollowing: (() => void) | undefined

  onMounted(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia(DARK_SCHEME_QUERY)
    const update = (): void => {
      appearance.value = resolveAppearance(root, prefersDark.matches)
    }
    const classObserver = new MutationObserver(update)

    update()
    classObserver.observe(root, {
      attributeFilter: ['class'],
      attributes: true,
    })
    prefersDark.addEventListener('change', update)

    stopFollowing = () => {
      classObserver.disconnect()
      prefersDark.removeEventListener('change', update)
    }
  })

  onBeforeUnmount(() => {
    stopFollowing?.()
  })

  return appearance
}

/** Resolves the current appearance from the theme class and the OS preference. */
export function resolveAppearance(
  root: Element,
  prefersDark: boolean,
): CommentsAppearance {
  if (root.classList.contains('dark')) {
    return 'dark'
  }
  if (root.classList.contains('light')) {
    return 'light'
  }
  return prefersDark ? 'dark' : 'light'
}
