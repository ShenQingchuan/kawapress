import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const testState = vi.hoisted(() => ({
  imports: 0,
  pluginRegistrations: 0,
}))

vi.mock('overlayscrollbars', () => {
  testState.imports += 1
  return {
    ClickScrollPlugin: { name: 'clickScroll' },
    OverlayScrollbars: {
      plugin: () => {
        testState.pluginRegistrations += 1
      },
    },
  }
})

beforeEach(() => {
  testState.imports = 0
  testState.pluginRegistrations = 0
  vi.resetModules()
})

afterEach(() => {
  vi.resetModules()
})

async function loadLoader(): Promise<typeof import('./os-scroll')> {
  return import('./os-scroll')
}

describe('loadOverlayScrollbars', () => {
  it('imports the runtime and registers the click-scroll plugin once', async () => {
    const { loadOverlayScrollbars } = await loadLoader()

    const [first, second] = await Promise.all([
      loadOverlayScrollbars(),
      loadOverlayScrollbars(),
    ])
    const third = await loadOverlayScrollbars()

    expect(first).toBe(second)
    expect(third).toBe(first)
    expect(testState.imports).toBe(1)
    expect(testState.pluginRegistrations).toBe(1)
    expect(first.ClickScrollPlugin).toBeDefined()
  })
})

describe('resolveNagiScrollOptions', () => {
  it('applies the nagi scrollbar look and keeps caller options', async () => {
    const { resolveNagiScrollOptions } = await loadLoader()

    const options = resolveNagiScrollOptions({
      overflow: { x: 'hidden' },
      scrollbars: { autoHide: 'never', visibility: 'visible' },
    })

    expect(options.overflow).toEqual({ x: 'hidden' })
    expect(options.scrollbars).toEqual({
      autoHide: 'leave',
      autoHideDelay: 0,
      clickScroll: true,
      theme: 'os-theme-nagi',
      visibility: 'visible',
    })
  })

  it('does not mutate the options it is given', async () => {
    const { resolveNagiScrollOptions } = await loadLoader()
    const input = { scrollbars: { autoHide: 'never' as const } }

    resolveNagiScrollOptions(input)

    expect(input).toEqual({ scrollbars: { autoHide: 'never' } })
  })
})
