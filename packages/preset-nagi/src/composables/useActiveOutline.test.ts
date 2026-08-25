import type { PageHeader } from 'kawapress'
import type { Ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useActiveOutline } from './useActiveOutline'

const testState = vi.hoisted(() => ({
  mountedHook: undefined as (() => void) | undefined,
  unmountedHook: undefined as (() => void) | undefined,
  page: { value: undefined } as { value: { headers: PageHeader[], path: string } | undefined },
  getScrollElement: (() => null) as () => HTMLElement | null,
}))

vi.mock('kawapress/client', () => ({
  usePageData: () => testState.page as Ref<typeof testState.page.value>,
}))

vi.mock('vue', async (importOriginal) => {
  const original = await importOriginal<typeof import('vue')>()
  return {
    ...original,
    onMounted: (hook: () => void) => {
      testState.mountedHook = hook
    },
    onUnmounted: (hook: () => void) => {
      testState.unmountedHook = hook
    },
    watch: () => () => {},
  }
})

vi.mock('./docScroll', () => ({
  useDocScrollElement: () => testState.getScrollElement,
}))

function header(
  level: number,
  title: string,
  slug: string,
  children: PageHeader[] = [],
): PageHeader {
  return {
    level,
    title,
    slug,
    link: `#${slug}`,
    children,
  }
}

describe('active outline', () => {
  afterEach(() => {
    testState.unmountedHook?.()
    testState.mountedHook = undefined
    testState.unmountedHook = undefined
    vi.unstubAllGlobals()
  })

  it('synchronizes a nested heading after independent hash navigation', async () => {
    const listeners = new Map<string, EventListener>()
    const root = {
      scrollTop: 0,
      clientHeight: 400,
      scrollHeight: 1200,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: () => ({ top: 0 }),
    }
    const positions: Record<string, number> = {
      parent: 100,
      child: 320,
    }
    const article = {
      querySelector: (selector: string) => {
        const slug = selector.slice(1)
        const top = positions[slug]
        if (top === undefined) {
          return null
        }
        return {
          getBoundingClientRect: () => ({ top: top - root.scrollTop }),
          scrollIntoView: () => {
            root.scrollTop = top
          },
        }
      },
    }
    const location = { hash: '' }
    const fakeWindow = {
      location,
      addEventListener: (type: string, listener: EventListener) => {
        listeners.set(type, listener)
      },
      removeEventListener: (type: string) => {
        listeners.delete(type)
      },
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callback(0)
        return 1
      },
      cancelAnimationFrame: vi.fn(),
    }

    testState.page.value = {
      path: '/guide',
      headers: [header(2, 'Parent', 'parent', [
        header(3, 'Child', 'child'),
      ])],
    }
    testState.getScrollElement = () => root as unknown as HTMLElement
    vi.stubGlobal('window', fakeWindow)
    vi.stubGlobal('document', {
      querySelector: () => article,
    })
    vi.stubGlobal('CSS', { escape: (value: string) => value })

    const { activeOutlineLink } = useActiveOutline()
    testState.mountedHook?.()
    await Promise.resolve()
    await Promise.resolve()

    expect(activeOutlineLink.value).toBe('#parent')

    location.hash = '#child'
    listeners.get('hashchange')?.(new Event('hashchange'))

    expect(root.scrollTop).toBe(320)
    expect(activeOutlineLink.value).toBe('#child')
  })

  it('does not finish a stale binding after unmount', async () => {
    let frameCallback: FrameRequestCallback | undefined
    let rootAvailable = false
    const root = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    testState.page.value = {
      path: '/guide',
      headers: [header(2, 'Parent', 'parent')],
    }
    testState.getScrollElement = () => rootAvailable
      ? root as unknown as HTMLElement
      : null
    vi.stubGlobal('window', {
      location: { hash: '' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        frameCallback = callback
        return 1
      },
      cancelAnimationFrame: vi.fn(),
    })
    vi.stubGlobal('document', {
      querySelector: () => ({}),
    })
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frameCallback = callback
      return 1
    })

    useActiveOutline()
    testState.mountedHook?.()
    await Promise.resolve()
    await Promise.resolve()
    expect(frameCallback).toBeDefined()

    testState.unmountedHook?.()
    testState.unmountedHook = undefined
    rootAvailable = true
    frameCallback?.(0)
    await Promise.resolve()
    await Promise.resolve()

    expect(root.addEventListener).not.toHaveBeenCalled()
  })
})
