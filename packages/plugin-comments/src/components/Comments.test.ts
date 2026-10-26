/**
 * The widget loads the official giscus script, so happy-dom must treat a
 * disabled script download as a success instead of logging a load error.
 *
 * @vitest-environment happy-dom
 * @vitest-environment-options { "settings": { "handleDisabledFileLoadingAsSuccess": true } }
 */

import type { App, ShallowRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick, shallowRef } from 'vue'
import Comments from './Comments.vue'

interface FakePage {
  path: string
  frontmatter: Record<string, unknown>
}

const testState = vi.hoisted(() => ({
  page: undefined as unknown as ShallowRef<FakePage | undefined>,
  site: undefined as unknown as ShallowRef<{
    localeIndex: string
    lang: string
  }>,
}))

vi.mock('kawapress/client', () => ({
  usePageData: () => testState.page,
  useSite: () => testState.site,
}))

vi.mock('../runtime-options', () => ({
  default: {
    giscus: {
      repo: 'kawapress/kawapress',
      repoId: 'R_kgDOExample',
      category: 'Comments',
      categoryId: 'DIC_kwDOExample',
      mapping: 'pathname',
      strict: false,
      reactionsEnabled: true,
      inputPosition: 'bottom',
      loading: 'lazy',
    },
    labels: {},
    localeLabels: {},
  },
}))

/** happy-dom ships an IntersectionObserver that never fires, so tests drive it. */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []

  readonly observed: Element[] = []
  disconnected = false

  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.instances.push(this)
  }

  observe(target: Element): void {
    this.observed.push(target)
  }

  unobserve(): void {}

  disconnect(): void {
    this.disconnected = true
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  enterViewport(): void {
    this.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
}

let app: App | undefined
let root: HTMLElement

beforeEach(() => {
  testState.page = shallowRef<FakePage | undefined>({ path: '/guide/a', frontmatter: {} })
  testState.site = shallowRef({ localeIndex: 'root', lang: 'zh-CN' })
  FakeIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
  document.documentElement.className = 'light'
  root = document.createElement('div')
  document.body.append(root)
})

afterEach(() => {
  app?.unmount()
  app = undefined
  document.body.replaceChildren()
  document.documentElement.className = ''
  vi.unstubAllGlobals()
})

describe('comments component', () => {
  it('renders the localized heading and waits for the viewport', async () => {
    await mountComments()

    expect(root.querySelector('h2')?.textContent?.trim()).toBe('评论')
    expect(root.querySelector('script')).toBeNull()

    const observer = FakeIntersectionObserver.instances[0]
    expect(observer?.observed).toHaveLength(1)
    expect(observer?.options?.rootMargin).toBe('200px')

    observer.enterViewport()
    await nextTick()

    expect(root.querySelector('script')?.dataset.theme).toBe('light')
    expect(observer.disconnected).toBe(true)
  })

  it('hides the whole section when a page turns comments off', async () => {
    testState.page.value = { path: '/guide/a', frontmatter: { comments: false } }
    await mountComments()
    FakeIntersectionObserver.instances[0]?.enterViewport()
    await nextTick()

    expect(root.querySelector('section')).toBeNull()
    expect(root.querySelector('script')).toBeNull()
  })

  it('follows a new appearance without reloading the thread', async () => {
    await mountComments()
    FakeIntersectionObserver.instances[0]?.enterViewport()
    await nextTick()
    const script = root.querySelector('script')

    document.documentElement.className = 'dark'
    await vi.waitFor(() => {
      expect(root.querySelector('script')?.dataset.theme).toBe('dark')
    })

    expect(root.querySelector('script')).toBe(script)
  })

  it('rebuilds the thread when the same instance shows another page', async () => {
    await mountComments()
    FakeIntersectionObserver.instances[0]?.enterViewport()
    await nextTick()
    const first = root.querySelector('script')

    testState.page.value = { path: '/guide/b', frontmatter: {} }
    await nextTick()

    const scripts = root.querySelectorAll('script')
    expect(scripts).toHaveLength(1)
    expect(scripts[0]).not.toBe(first)
  })
})

async function mountComments(): Promise<void> {
  app = createApp(Comments)
  app.mount(root)
  await nextTick()
  await nextTick()
}
