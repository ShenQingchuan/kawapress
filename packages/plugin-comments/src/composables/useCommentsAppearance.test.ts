// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'
import { resolveAppearance, useCommentsAppearance } from './useCommentsAppearance'

afterEach(() => {
  document.documentElement.className = ''
  document.body.replaceChildren()
})

describe('comments appearance', () => {
  it('prefers the theme class over the system preference', () => {
    const root = document.createElement('html')
    expect(resolveAppearance(root, true)).toBe('dark')
    expect(resolveAppearance(root, false)).toBe('light')

    root.className = 'light'
    expect(resolveAppearance(root, true)).toBe('light')

    root.className = 'dark'
    expect(resolveAppearance(root, false)).toBe('dark')
  })

  it('follows class changes on the html element', async () => {
    document.documentElement.className = 'dark'
    const root = document.createElement('div')
    document.body.append(root)
    createApp(defineComponent({
      setup() {
        const appearance = useCommentsAppearance()
        return () => h('p', appearance.value)
      },
    })).mount(root)

    await nextTick()
    expect(root.textContent).toBe('dark')

    document.documentElement.className = 'light'
    await vi.waitFor(() => expect(root.textContent).toBe('light'))
  })
})
