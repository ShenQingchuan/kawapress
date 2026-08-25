import { usePageData } from 'kawapress/client'
import { nextTick, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import {
  findOutlineHeaderByHash,
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
let bindGeneration = 0
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

  function scrollToLocationHash(): boolean {
    const root = scrollRoot
    const doc = article
    if (!root || !doc || !window.location.hash) {
      return false
    }

    const header = findOutlineHeaderByHash(
      getOutlineHeaders(page.value?.headers ?? []),
      window.location.hash,
    )
    const target = header
      ? doc.querySelector<HTMLElement>(`#${CSS.escape(header.slug)}`)
      : null
    if (!header || !target) {
      return false
    }

    target.scrollIntoView({ block: 'start' })
    activateLink(header.link, true)
    return true
  }

  function onHashChange(): void {
    if (!scrollToLocationHash()) {
      updateActive()
    }
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
    const generation = ++bindGeneration
    let nextScrollRoot: HTMLElement | null = null
    let nextArticle: HTMLElement | null = null

    await nextTick()
    for (let attempt = 0; attempt < 8; attempt += 1) {
      nextScrollRoot = getScrollElement()
      nextArticle = document.querySelector<HTMLElement>('.nagi-main--doc .nagi-doc')
      if (nextScrollRoot && nextArticle) {
        break
      }
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    }
    if (generation !== bindGeneration || subscriberCount === 0) {
      return
    }

    scrollRoot = nextScrollRoot
    article = nextArticle
    scrollRoot?.addEventListener('scroll', onScroll, { passive: true })
    if (!scrollToLocationHash()) {
      updateActive()
    }
  }

  function unbind(): void {
    bindGeneration += 1
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
      window.addEventListener('hashchange', onHashChange)
      stopPageWatch = watch(() => page.value?.path, () => {
        activateLink(
          flattenOutlineHeaders(getOutlineHeaders(page.value?.headers ?? []))[0]?.link ?? null,
        )
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
      window.removeEventListener('hashchange', onHashChange)
      unbind()
    }
  })

  return {
    activeOutlineLink,
    activateLink,
  }
}
