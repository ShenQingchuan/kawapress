// @vitest-environment happy-dom

import type { App, ShallowRef } from 'vue'
import type { LastUpdatedRuntimeOptions } from '../types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick, shallowRef } from 'vue'
import LastUpdated from './LastUpdated.vue'

interface TestSite {
  lang: string
  localeIndex: string
}

interface TestPage {
  path: string
  frontmatter: Record<string, unknown>
  lastUpdated?: number
  editLink?: string
}

const testState = vi.hoisted(() => ({
  site: undefined as unknown as ShallowRef<TestSite>,
  page: undefined as unknown as ShallowRef<TestPage | undefined>,
  options: {} as LastUpdatedRuntimeOptions,
}))

vi.mock('kawapress/client', () => ({
  useSite: () => testState.site,
  usePageData: () => testState.page,
}))

vi.mock('../runtime-options', () => ({
  get runtimeOptions() {
    return testState.options
  },
}))

/** Late evening UTC, so most zones render another day and another hour. */
const VALUE = Date.parse('2024-05-06T23:30:00Z')
const LOCAL_TIME_ZONE = new Intl.DateTimeFormat().resolvedOptions().timeZone

let app: App<Element> | undefined

beforeEach(() => {
  testState.site = shallowRef({ lang: 'en', localeIndex: 'root' })
  testState.page = shallowRef({
    path: '/guide',
    frontmatter: {},
    lastUpdated: VALUE,
  })
  testState.options = {}
})

afterEach(() => {
  app?.unmount()
  app = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

function mount(): void {
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp(LastUpdated)
  app.mount(host)
}

function text(): string {
  return document.querySelector('.kawa-last-updated__text')?.textContent?.trim() ?? ''
}

function expected(lang: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(lang, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(VALUE)
}

describe('last updated', () => {
  it('renders the date in UTC first and in the visitor zone after mounting', async () => {
    mount()
    const utcText = `Last updated: ${expected('en', 'UTC')}`
    expect(document.querySelector('.kawa-last-updated__time')?.getAttribute('datetime'))
      .toBe('2024-05-06T23:30:00.000Z')
    expect(text()).toBe(utcText)

    await nextTick()
    expect(text()).toBe(`Last updated: ${expected('en', LOCAL_TIME_ZONE)}`)
  })

  it('renders nothing without a date and without an edit link', () => {
    testState.page.value = { path: '/guide', frontmatter: {} }
    mount()

    expect(document.querySelector('.kawa-last-updated')).toBeNull()
  })

  it('hides the date when the page opts out', () => {
    testState.page.value = {
      path: '/guide',
      frontmatter: { lastUpdated: false },
      lastUpdated: VALUE,
    }
    mount()

    expect(document.querySelector('.kawa-last-updated')).toBeNull()
  })

  it('renders the edit link before the date', () => {
    testState.page.value = {
      path: '/guide',
      frontmatter: {},
      lastUpdated: VALUE,
      editLink: 'https://github.com/o/r/edit/main/docs/guide.md',
    }
    mount()

    const link = document.querySelector('.kawa-last-updated__edit')
    expect(link?.getAttribute('href')).toBe('https://github.com/o/r/edit/main/docs/guide.md')
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link?.textContent).toBe('Edit this page')
    expect(text()).toContain('Last updated')

    const container = document.querySelector('.kawa-last-updated')
    expect(container?.firstElementChild).toBe(link)
  })

  it('keeps the date when only the edit link opts out', () => {
    testState.page.value = {
      path: '/guide',
      frontmatter: { editLink: false },
      lastUpdated: VALUE,
      editLink: 'https://github.com/o/r/edit/main/docs/guide.md',
    }
    mount()

    expect(document.querySelector('.kawa-last-updated__edit')).toBeNull()
    expect(text()).toContain('Last updated')
  })

  it('uses the Chinese text for a Chinese page', () => {
    testState.site.value = { lang: 'zh-CN', localeIndex: 'root' }
    mount()

    expect(text()).toBe(`最后更新于：${expected('zh-CN', 'UTC')}`)
  })

  it('lets the plugin options replace the text and the format', () => {
    testState.site.value = { lang: 'zh-CN', localeIndex: 'root' }
    testState.options = {
      labels: { lastUpdated: 'Updated', editLink: 'Improve this' },
      localeLabels: { root: { lastUpdated: '根更新于' } },
      formatOptions: { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' },
    }
    testState.page.value = {
      path: '/guide',
      frontmatter: {},
      lastUpdated: VALUE,
      editLink: 'https://github.com/o/r/edit/main/docs/guide.md',
    }
    mount()

    expect(document.querySelector('.kawa-last-updated__edit')?.textContent).toBe('Improve this')
    // An explicit zone never re-formats on the client, so no tick is needed.
    expect(text()).toBe(`根更新于：${new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(VALUE)}`)
  })
})
