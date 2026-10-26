// @vitest-environment happy-dom

import type { App, Ref, ShallowRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref, shallowRef } from 'vue'
import OsScroll from './OsScroll.vue'

interface Initialization {
  target: HTMLElement
  elements: { viewport: HTMLElement, content: HTMLElement }
}

interface Runtime {
  OverlayScrollbars: (initialization: Initialization, options: Record<string, unknown>) => unknown
}

const testState = vi.hoisted(() => ({
  load: null as unknown as () => Promise<Runtime>,
  initializations: [] as { initialization: Initialization, options: Record<string, unknown> }[],
}))

vi.mock('../os-scroll', () => ({
  loadOverlayScrollbars: () => testState.load(),
  resolveNagiScrollOptions: (options: Record<string, unknown>) => ({
    ...options,
    scrollbars: { theme: 'os-theme-nagi', ...(options.scrollbars as object) },
  }),
}))

let app: App<Element> | undefined
let destroy: ReturnType<typeof vi.fn>
let updateOptions: ReturnType<typeof vi.fn>
let resolveRuntime: (runtime: Runtime) => void
let rejectRuntime: (error: Error) => void
let osScroll: Ref<InstanceType<typeof OsScroll> | null>
let options: ShallowRef<Record<string, unknown>>

beforeEach(() => {
  testState.initializations = []
  destroy = vi.fn()
  updateOptions = vi.fn()
  options = shallowRef({})
  testState.load = () => new Promise<Runtime>((resolve, reject) => {
    resolveRuntime = resolve
    rejectRuntime = reject
  })
  app = undefined
  document.body.innerHTML = '<div id="app"></div>'
})

afterEach(() => {
  app?.unmount()
  app = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

const fakeRuntime: Runtime = {
  OverlayScrollbars: (initialization, runtimeOptions) => {
    testState.initializations.push({ initialization, options: runtimeOptions })
    return { destroy, options: updateOptions }
  },
}

function mountOsScroll(): void {
  osScroll = ref<InstanceType<typeof OsScroll> | null>(null)
  app = createApp(defineComponent({
    setup: () => () => h(
      OsScroll,
      { ref: osScroll, options: options.value },
      () => h('p', { class: 'content' }, 'content'),
    ),
  }))
  app.mount('#app')
}

/** Lets the pending dynamic import and the following mount hooks settle. */
async function settle(): Promise<void> {
  await nextTick()
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()
}

function host(): HTMLElement {
  return document.querySelector<HTMLElement>('.nagi-os-scroll')!
}

function viewport(): HTMLElement {
  return document.querySelector<HTMLElement>('.nagi-os-scroll__viewport')!
}

describe('osScroll', () => {
  it('renders a plain scroll container before the runtime is loaded', async () => {
    mountOsScroll()
    await settle()

    expect(host()).not.toBeNull()
    expect(viewport().parentElement).toBe(host())
    expect(viewport().querySelector('.content')?.textContent).toBe('content')
    expect(host().hasAttribute('data-overlayscrollbars')).toBe(false)
    expect(testState.initializations).toHaveLength(0)
  })

  it('exposes the same scrolling element before and after the enhancement', async () => {
    mountOsScroll()
    await settle()

    const before = viewport()
    expect(osScroll.value?.getScrollElement()).toBe(before)
    expect(osScroll.value?.osInstance()).toBeNull()

    resolveRuntime(fakeRuntime)
    await settle()

    expect(testState.initializations).toHaveLength(1)
    expect(osScroll.value?.getScrollElement()).toBe(before)
    expect(osScroll.value?.osInstance()).not.toBeNull()
  })

  it('hands the rendered viewport to the runtime so the slot keeps its place', async () => {
    mountOsScroll()
    await settle()
    resolveRuntime(fakeRuntime)
    await settle()

    const { initialization, options: runtimeOptions } = testState.initializations[0]!
    expect(initialization.target).toBe(host())
    expect(initialization.elements.viewport).toBe(viewport())
    expect(initialization.elements.content).toBe(viewport())
    expect(viewport().querySelector('.content')?.textContent).toBe('content')
    expect(runtimeOptions.scrollbars).toMatchObject({ theme: 'os-theme-nagi' })
  })

  it('passes changed options to the running instance', async () => {
    mountOsScroll()
    await settle()
    resolveRuntime(fakeRuntime)
    await settle()

    options.value = { overflow: { x: 'hidden' } }
    await settle()

    expect(updateOptions).toHaveBeenCalledWith(
      expect.objectContaining({ overflow: { x: 'hidden' } }),
      true,
    )
  })

  it('destroys the instance on unmount', async () => {
    mountOsScroll()
    await settle()
    resolveRuntime(fakeRuntime)
    await settle()

    app?.unmount()
    app = undefined
    expect(destroy).toHaveBeenCalledTimes(1)
  })

  it('does not initialize a scroll area that unmounted while loading', async () => {
    mountOsScroll()
    await settle()

    app?.unmount()
    app = undefined
    resolveRuntime(fakeRuntime)
    await settle()

    expect(testState.initializations).toHaveLength(0)
  })

  it('keeps the native scroll area when the runtime cannot be loaded', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mountOsScroll()
    await settle()

    rejectRuntime(new Error('chunk is missing'))
    await settle()

    expect(testState.initializations).toHaveLength(0)
    expect(osScroll.value?.osInstance()).toBeNull()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('native scrollbar'),
      expect.any(Error),
    )
  })
})
