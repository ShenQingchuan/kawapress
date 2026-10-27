import { describe, expect, it } from 'vitest'
import { pageChunkFileName, pageChunkHash, pageInputName } from './page-chunk'

describe('pageInputName', () => {
  it('names the input of a page after its route', () => {
    expect(pageInputName('/guide/intro')).toBe('pages/guide/intro')
  })

  it('names the home page input `index`', () => {
    expect(pageInputName('/')).toBe('pages/index')
  })
})

describe('pageChunkFileName', () => {
  it('builds the file name of a page chunk from route and hash', () => {
    expect(pageChunkFileName('/guide/intro', 'aBcDeFgH'))
      .toBe('assets/pages/guide/intro-aBcDeFgH.js')
    expect(pageChunkFileName('/', 'aBcDeFgH'))
      .toBe('assets/pages/index-aBcDeFgH.js')
  })
})

describe('pageChunkHash', () => {
  it('reads the hash back out of a page chunk file name', () => {
    expect(pageChunkHash('/guide/intro', 'assets/pages/guide/intro-aBcDeFgH.js'))
      .toBe('aBcDeFgH')
  })

  it('refuses a file name that does not follow the layout', () => {
    // A different directory, extension or route means the build no longer names
    // page chunks the way the page table assumes.
    expect(pageChunkHash('/guide/intro', 'assets/guide/intro-aBcDeFgH.js')).toBeUndefined()
    expect(pageChunkHash('/guide/intro', 'assets/pages/guide/intro-aBcDeFgH.mjs')).toBeUndefined()
    expect(pageChunkHash('/guide/intro', 'assets/pages/guide/other-aBcDeFgH.js')).toBeUndefined()
    expect(pageChunkHash('/guide/intro', 'assets/pages/guide/intro-.js')).toBeUndefined()
    expect(pageChunkHash('/guide/intro', 'assets/pages/guide/intro-a/b.js')).toBeUndefined()
  })

  it('round trips every page route', () => {
    for (const route of ['/', '/guide/intro', '/en/guide/intro', '/guide/路由']) {
      expect(pageChunkHash(route, pageChunkFileName(route, 'x1y2z3'))).toBe('x1y2z3')
    }
  })
})
