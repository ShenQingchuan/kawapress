// @vitest-environment happy-dom

import type { App, ShallowRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick, shallowRef } from 'vue'
import LlmsActions from './LlmsActions.vue'

interface TestRoute {
  path: string
}

interface TestSite {
  base: string
  lang: string
  localeIndex: string
}

const testState = vi.hoisted(() => ({
  route: undefined as unknown as ShallowRef<TestRoute>,
  site: undefined as unknown as ShallowRef<TestSite>,
}))

vi.mock('kawapress/client', () => ({
  useRouter: () => ({ currentRoute: testState.route }),
  useSite: () => testState.site,
}))

let app: App<Element> | undefined
let originalClipboard: PropertyDescriptor | undefined

beforeEach(() => {
  testState.route = shallowRef({ path: '/guide' })
  testState.site = shallowRef({
    base: '/',
    lang: 'en',
    localeIndex: 'root',
  })
  originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

  const host = document.createElement('div')
  document.body.append(host)
  app = createApp(LlmsActions)
  app.mount(host)
})

afterEach(() => {
  app?.unmount()
  app = undefined
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()

  if (originalClipboard) {
    Object.defineProperty(navigator, 'clipboard', originalClipboard)
  }
  else {
    Reflect.deleteProperty(navigator, 'clipboard')
  }
})

describe('llms actions', () => {
  it('clears copy feedback immediately when the route changes', async () => {
    const clipboard = {
      writeText: vi.fn<(value: string) => Promise<void>>().mockResolvedValue(),
    }
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: clipboard,
    })

    const fetchMarkdown = vi.fn<(input: string | URL | Request) => Promise<Response>>()
      .mockResolvedValue(markdownResponse('# Guide'))
    vi.stubGlobal('fetch', fetchMarkdown)

    const primaryButton = [...document.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Copy page Markdown'))
    expect(primaryButton).toBeDefined()

    primaryButton!.click()
    await flushPromises()

    expect(primaryButton!.textContent).toContain('Markdown copied')
    expect(clipboard.writeText).toHaveBeenCalledWith('# Guide')

    testState.route.value = { path: '/next' }
    await nextTick()

    expect(primaryButton!.textContent).toContain('Copy page Markdown')

    const pendingResponse = deferred<Response>()
    fetchMarkdown.mockReturnValueOnce(pendingResponse.promise)
    primaryButton!.click()
    await nextTick()

    testState.route.value = { path: '/third' }
    pendingResponse.resolve(markdownResponse('# Next'))
    await flushPromises()

    expect(primaryButton!.textContent).toContain('Copy page Markdown')
    expect(primaryButton!.getAttribute('aria-busy')).toBe('false')
    expect(clipboard.writeText).toHaveBeenCalledOnce()
  })
})

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

function markdownResponse(content: string): Response {
  return {
    ok: true,
    text: () => Promise.resolve(content),
  } as Response
}

function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}
