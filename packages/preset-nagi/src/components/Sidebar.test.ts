// @vitest-environment happy-dom

import type { App, ShallowRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick, shallowRef } from 'vue'
import Sidebar from './Sidebar.vue'

const testState = vi.hoisted(() => ({
  route: undefined as unknown as ShallowRef<{ path: string }>,
  theme: undefined as unknown as ShallowRef<{
    sidebarMenuLabel: string
    sidebarResizeLabel: string
  }>,
}))

vi.mock('kawapress/client', () => ({
  useRouter: () => ({ currentRoute: testState.route }),
}))

vi.mock('../composables/useNagiThemeConfig', () => ({
  useNagiThemeConfig: () => testState.theme,
}))

vi.mock('../composables/useSidebarItems', () => ({
  useSidebarItems: () => [],
}))

vi.mock('./OsScroll.vue', () => ({
  default: {
    name: 'OsScrollStub',
    inheritAttrs: false,
    setup: (_props: unknown, { slots }: { slots: { default?: () => unknown } }) =>
      () => slots.default?.(),
  },
}))

vi.mock('./SidebarItem.vue', () => ({
  default: { name: 'SidebarItemStub' },
}))

let app: App<Element> | undefined

beforeEach(() => {
  testState.route = shallowRef({ path: '/guide' })
  testState.theme = shallowRef({
    sidebarMenuLabel: 'Menu',
    sidebarResizeLabel: 'Resize sidebar',
  })
  window.localStorage.clear()
  document.documentElement.style.removeProperty('--nagi-sidebar-width')
  document.body.innerHTML = '<div id="app"></div>'
})

afterEach(() => {
  app?.unmount()
  app = undefined
  window.localStorage.clear()
  document.documentElement.style.removeProperty('--nagi-sidebar-width')
  document.documentElement.removeAttribute('data-nagi-sidebar-resizing')
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('desktop sidebar resizing', () => {
  it('restores, resizes, clamps, persists, and resets its width', async () => {
    window.localStorage.setItem('kawapress:nagi:sidebar-width', '15.5')
    mountSidebar()
    await nextTick()

    const separator = document.querySelector<HTMLElement>('[role="separator"]')
    expect(separator).not.toBeNull()
    expect(separator!.getAttribute('aria-label')).toBe('Resize sidebar')
    expect(separator!.getAttribute('aria-valuemin')).toBe('14')
    expect(separator!.getAttribute('aria-valuemax')).toBe('17')
    expect(separator!.getAttribute('aria-valuenow')).toBe('15.5')
    expect(document.documentElement.style.getPropertyValue('--nagi-sidebar-width'))
      .toBe('15.5rem')

    separator!.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'ArrowLeft',
    }))
    await nextTick()

    expect(separator!.getAttribute('aria-valuenow')).toBe('15')
    expect(window.localStorage.getItem('kawapress:nagi:sidebar-width')).toBe('15')

    separator!.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Home',
    }))
    await nextTick()
    expect(separator!.getAttribute('aria-valuenow')).toBe('14')

    separator!.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'ArrowLeft',
    }))
    await nextTick()
    expect(separator!.getAttribute('aria-valuenow')).toBe('14')

    separator!.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'End',
    }))
    await nextTick()
    expect(separator!.getAttribute('aria-valuenow')).toBe('17')

    separator!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    await nextTick()

    expect(separator!.getAttribute('aria-valuenow')).toBe('17')
    expect(window.localStorage.getItem('kawapress:nagi:sidebar-width')).toBeNull()
    expect(document.documentElement.style.getPropertyValue('--nagi-sidebar-width'))
      .toBe('')
  })

  it('resizes with pointer dragging and ignores the drawer', async () => {
    mountSidebar()
    await nextTick()

    const separator = document.querySelector<HTMLElement>('[role="separator"]')!
    Object.defineProperties(separator, {
      hasPointerCapture: { value: () => true },
      releasePointerCapture: { value: vi.fn() },
      setPointerCapture: { value: vi.fn() },
    })

    separator.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientX: 272,
      pointerId: 1,
    }))
    separator.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      clientX: 256,
      pointerId: 1,
    }))
    separator.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      clientX: 256,
      pointerId: 1,
    }))
    await nextTick()

    expect(separator.getAttribute('aria-valuenow')).toBe('16')
    expect(window.localStorage.getItem('kawapress:nagi:sidebar-width')).toBe('16')
    expect(document.documentElement.hasAttribute('data-nagi-sidebar-resizing'))
      .toBe(false)

    app?.unmount()
    document.body.innerHTML = '<div id="app"></div>'
    mountSidebar({ mode: 'drawer' })
    await nextTick()

    expect(document.querySelector('[role="separator"]')).toBeNull()
  })
})

function mountSidebar(props: { mode?: 'desktop' | 'drawer' } = {}): void {
  app = createApp(Sidebar, props)
  app.mount('#app')
}
