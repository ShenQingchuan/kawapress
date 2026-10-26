import { describe, expect, it } from 'vitest'
import { formatProjectTitle, toProjectName } from './naming'

describe('formatProjectTitle', () => {
  it('splits a directory name into capitalized words', () => {
    expect(formatProjectTitle('my-kawapress-site')).toBe('My Kawapress Site')
  })

  it('handles underscores, dots and spaces', () => {
    expect(formatProjectTitle('my_docs.site v2')).toBe('My Docs Site V2')
  })

  it('keeps non-latin characters', () => {
    expect(formatProjectTitle('我的文档')).toBe('我的文档')
  })

  it('falls back to a readable title for an empty name', () => {
    expect(formatProjectTitle('---')).toBe('KawaPress Site')
  })
})

describe('toProjectName', () => {
  it('lowercases and joins words with dashes', () => {
    expect(toProjectName('My Site!')).toBe('my-site')
  })

  it('keeps letters, digits, dots, dashes and underscores', () => {
    expect(toProjectName('docs.v2_final')).toBe('docs.v2_final')
  })

  it('trims separators at both ends', () => {
    expect(toProjectName('__my-site__')).toBe('my-site')
  })

  it('falls back to the default directory name when nothing usable is left', () => {
    expect(toProjectName('文档')).toBe('kawapress-site')
    expect(toProjectName('')).toBe('kawapress-site')
  })
})
