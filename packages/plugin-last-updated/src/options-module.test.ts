import type { Plugin } from 'vite'
import { describe, expect, it } from 'vitest'
import {
  createRuntimeOptions,
  LAST_UPDATED_OPTIONS_MODULE_ID,
  lastUpdatedOptionsPlugin,
} from './options-module'

describe('runtime options module', () => {
  it('keeps only what the runtime needs and drops unset entries', () => {
    expect(createRuntimeOptions({})).toEqual({})
    expect(createRuntimeOptions({
      lastUpdated: { formatOptions: { dateStyle: 'full' } },
      editLink: { pattern: 'https://example.com/edit/:path' },
      localeLabels: { en: { lastUpdated: 'Touched' } },
    })).toEqual({
      formatOptions: { dateStyle: 'full' },
      localeLabels: { en: { lastUpdated: 'Touched' } },
    })
  })

  it('turns the edit link text into the weakest label', () => {
    expect(createRuntimeOptions({
      editLink: { pattern: 'https://example.com/edit/:path', text: 'Improve this' },
    }).labels).toEqual({ editLink: 'Improve this' })

    expect(createRuntimeOptions({
      editLink: { pattern: 'https://example.com/edit/:path', text: 'Improve this' },
      labels: { editLink: 'Edit page' },
    }).labels).toEqual({ editLink: 'Edit page' })
  })

  it('emits the options as JSON', () => {
    const source = loadModule(lastUpdatedOptionsPlugin({
      labels: { lastUpdated: 'Updated' },
      formatOptions: { dateStyle: 'full' },
    }))

    expect(source).toContain('export const lastUpdatedOptions')
    expect(JSON.parse(source.slice(source.indexOf('=') + 1))).toEqual({
      labels: { lastUpdated: 'Updated' },
      formatOptions: { dateStyle: 'full' },
    })
  })

  it('reports options that cannot become JSON', () => {
    expect(() => loadModule(lastUpdatedOptionsPlugin({
      formatOptions: { timeZone: new Date(0) as unknown as string },
    }))).toThrow(/not JSON-serializable/)
  })
})

function loadModule(plugin: Plugin): string {
  const resolved = callHook(plugin, 'resolveId', LAST_UPDATED_OPTIONS_MODULE_ID)
  expect(resolved).toBe(`\0${LAST_UPDATED_OPTIONS_MODULE_ID}`)

  const source = callHook(plugin, 'load', resolved as string)
  if (typeof source !== 'string') {
    throw new TypeError('Expected the options module to have a source.')
  }
  return source
}

function callHook(
  plugin: Plugin,
  hook: 'resolveId' | 'load',
  id: string,
): unknown {
  const handler = plugin[hook]
  if (typeof handler !== 'function') {
    throw new TypeError(`Expected the plugin to define ${hook}().`)
  }
  return (handler as (value: string) => unknown).call(plugin, id)
}
