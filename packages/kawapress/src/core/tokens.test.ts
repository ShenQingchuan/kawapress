import { describe, expect, it } from 'vitest'
import {
  KAWA_DEFAULT_TOKENS,
  KAWA_LAYER_ORDER,
  KAWA_TOKEN_NAMES,
} from './tokens'

describe('default tokens', () => {
  it('declares layers from the lowest to the highest priority', () => {
    expect(KAWA_LAYER_ORDER)
      .toBe('@layer kawa.base, kawa.plugin, kawa.theme;')
  })

  it('defines every published token with a value', () => {
    const declared = [...KAWA_DEFAULT_TOKENS.matchAll(/(--kawa-[\w-]+)\s*:/g)]
      .map(match => match[1])

    expect(declared).toEqual([...KAWA_TOKEN_NAMES])
  })

  it('keeps every color token readable in both color schemes', () => {
    const colorTokens = KAWA_TOKEN_NAMES.filter(name => name.startsWith('--kawa-c-'))

    for (const name of colorTokens) {
      expect(KAWA_DEFAULT_TOKENS).toMatch(
        new RegExp(`${name}: light-dark\\([^,]+, [^)]+\\);`),
      )
    }
  })

  it('owns the base layer and enables light-dark() by default', () => {
    expect(KAWA_DEFAULT_TOKENS).toMatch(/^@layer kawa\.base \{\n {2}:root \{\n/)
    expect(KAWA_DEFAULT_TOKENS).toContain('color-scheme: light dark;')
    expect(KAWA_DEFAULT_TOKENS.trimEnd().endsWith('}')).toBe(true)
  })
})
