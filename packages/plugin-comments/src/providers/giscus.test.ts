/**
 * The widget loads the official giscus script, so happy-dom must treat a
 * disabled script download as a success instead of logging a load error.
 *
 * @vitest-environment happy-dom
 * @vitest-environment-options { "settings": { "handleDisabledFileLoadingAsSuccess": true } }
 */

import type { ResolvedGiscusOptions } from '../options'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGiscusProvider, GISCUS_SCRIPT_URL, resolveGiscusLang } from './giscus'

const OPTIONS: ResolvedGiscusOptions = {
  repo: 'kawapress/kawapress',
  repoId: 'R_kgDOExample',
  category: 'Comments',
  categoryId: 'DIC_kwDOExample',
  mapping: 'pathname',
  strict: false,
  reactionsEnabled: true,
  inputPosition: 'bottom',
  loading: 'lazy',
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('giscus provider', () => {
  it('maps the site language to a giscus locale', () => {
    expect(resolveGiscusLang('zh-CN')).toBe('zh-CN')
    expect(resolveGiscusLang('zh')).toBe('zh-CN')
    expect(resolveGiscusLang('en')).toBe('en')
    expect(resolveGiscusLang('ja')).toBe('en')
    expect(resolveGiscusLang(undefined)).toBe('en')
  })

  it('appends the official client script with the configured data attributes', () => {
    const container = createContainer()
    createGiscusProvider(OPTIONS).create(container, {
      appearance: 'dark',
      lang: 'zh-CN',
    })

    const script = container.querySelector('script')
    expect(script?.src).toBe(GISCUS_SCRIPT_URL)
    expect({ ...script?.dataset }).toMatchObject({
      repo: 'kawapress/kawapress',
      repoId: 'R_kgDOExample',
      category: 'Comments',
      categoryId: 'DIC_kwDOExample',
      mapping: 'pathname',
      strict: '0',
      reactionsEnabled: '1',
      inputPosition: 'bottom',
      loading: 'lazy',
      theme: 'dark',
      lang: 'zh-CN',
    })
  })

  it('sends a setConfig message when the appearance changes', () => {
    const container = createContainer()
    const frame = document.createElement('iframe')
    frame.className = 'giscus-frame'
    container.append(frame)
    const postMessage = vi.fn()
    Object.defineProperty(frame, 'contentWindow', {
      value: { postMessage },
    })

    const thread = createGiscusProvider(OPTIONS).create(container, {
      appearance: 'light',
      lang: 'en',
    })
    thread.setAppearance('dark')

    expect(container.querySelector('script')?.dataset.theme).toBe('dark')
    expect(postMessage).toHaveBeenCalledWith(
      { giscus: { setConfig: { theme: 'dark' } } },
      'https://giscus.app',
    )
  })

  it('removes the script and the iframe giscus rendered next to it', () => {
    const container = createContainer()
    const thread = createGiscusProvider(OPTIONS).create(container, {
      appearance: 'light',
      lang: 'en',
    })
    container.append(document.createElement('iframe'))

    thread.destroy()

    expect(container.childElementCount).toBe(0)
  })
})

function createContainer(): HTMLElement {
  const container = document.createElement('div')
  document.body.append(container)
  return container
}
