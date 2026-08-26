import { describe, expect, it } from 'vitest'
import { resolveNagiPageOptions } from './frontmatter'

describe('nagi frontmatter', () => {
  it('reads page presentation controls without consuming custom data', () => {
    expect(resolveNagiPageOptions({
      layout: 'page',
      navbar: false,
      sidebar: false,
      aside: false,
      outline: false,
      footer: false,
      pageClass: 'guide-page',
      customData: true,
    })).toEqual({
      layout: 'page',
      navbar: false,
      sidebar: false,
      aside: false,
      outline: false,
      footer: false,
      pageClass: 'guide-page',
    })
  })
})
