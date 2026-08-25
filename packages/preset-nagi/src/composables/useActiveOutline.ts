import { usePageData } from 'kawapress/client'
import { nextTick, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import {
  flattenOutlineHeaders,
  getOutlineHeaders,
  resolveActiveOutlineLink,
} from '../outline'
import { useDocScrollElement } from './docScroll'

const activeOutlineLink = shallowRef<string | null>(null)
let subscriberCount = 0
let scrollRoot: HTMLElement | null = null
let article: HTMLElement | null = null
let frame = 0
let ignoreUntil = 0
let stopPageWatch: (() => void) | undefined

export function useActiveOutline() {
  const page = usePageData()
  const getScrollElement = useDocScrollElement()

  function activateLink(link: string | null, sticky = false): void {
    activeOutlineLink.value = link
    if (sticky) {
      ignoreUntil = Date.now() + 400
    }
  }

  function updateActive(): void {
    const root = scrollRoot
    const doc = article
    if (!root || !doc) {
      return
    }

    const headers = flattenOutlineHeaders(getOutlineHeaders(page.value?.headers ?? []))
      .flatMap((header) => {
        const element = doc.querySelector<HTMLElement>(`#${CSS.escape(header.slug)}`)
        if (!element) {
          return []
        }
        return [{
          link: header.link,
          top: element.getBoundingClientRect().top
            - root.getBoundingClientRect().top
            + root.scrollTop,
        }]
      })

    activateLink(resolveActiveOutlineLink(
      headers,
      root.scrollTop,
      root.clientHeight,
      root.scrollHeight,
    ))
  }

  function onScroll(): void {
    if (Date.now() < ignoreUntil) {
      return
    }
    if (frame) {
      return
    }
    frame = window.requestAnimationFrame(() => {
      frame = 0
      updateActive()
    })
  }

  async function bind(): Promise<void> {
    await nextTick()
    for (let attempt = 0; attempt < 8; attempt += 1) {
      scrollRoot = getScrollElement()
      article = document.querySelector<HTMLElement>('.nagi-main--doc .nagi-doc')
      if (scrollRoot && article) {
        break
      }
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    }
    scrollRoot?.addEventListener('scroll', onScroll, { passive: true })
    updateActive()
  }

  function unbind(): void {
    scrollRoot?.removeEventListener('scroll', onScroll)
    if (frame) {
      window.cancelAnimationFrame(frame)
      frame = 0
    }
    scrollRoot = null
    article = null
  }

  onMounted(() => {
    subscriberCount += 1
    if (subscriberCount === 1) {
      void bind()
      window.addEventListener('hashchange', updateActive)
      stopPageWatch = watch(() => page.value?.path, () => {
        unbind()
        void bind()
      })
    }
  })

  onUnmounted(() => {
    subscriberCount -= 1
    if (subscriberCount === 0) {
      stopPageWatch?.()
      stopPageWatch = undefined
      window.removeEventListener('hashchange', updateActive)
      unbind()
    }
  })

  return {
    activeOutlineLink,
    activateLink,
  }
}
