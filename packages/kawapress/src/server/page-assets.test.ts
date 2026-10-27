import { describe, expect, it } from 'vitest'
import { collectPageAssets, collectPageChunk, toManifestKey } from './page-assets'

const ENTRY_KEY = 'packages/kawapress/src/client/entries/entry-client.ts'

/**
 * A manifest of the shape the build writes once every Markdown page is an input
 * of its own: the entry imports the app chunk, each page is one chunk that
 * imports the app and a helper shared by every page.
 */
const manifest = {
  [ENTRY_KEY]: {
    file: 'assets/entry-client.js',
    isEntry: true,
    css: ['assets/entry-client.css'],
    imports: ['_app.js'],
  },
  '_app.js': {
    file: 'assets/app.js',
    css: ['assets/app.css'],
  },
  'src/index.md': {
    file: 'assets/pages/index.js',
    isEntry: true,
    imports: [ENTRY_KEY, '__helper.js'],
  },
  'src/guide/plain.md': {
    file: 'assets/pages/guide/plain.js',
    isEntry: true,
    imports: [ENTRY_KEY, '__helper.js'],
  },
  'src/guide/styled.md': {
    file: 'assets/pages/guide/styled.js',
    isEntry: true,
    css: ['assets/pages/guide/styled.css'],
    imports: [ENTRY_KEY, '__helper.js'],
  },
  '__helper.js': {
    file: 'assets/helper.js',
  },
}

describe('collectPageChunk', () => {
  it('records the page chunk file and the JS it needs beyond the entry', () => {
    expect(collectPageChunk(manifest, '/src/guide/plain.md', ENTRY_KEY)).toEqual({
      file: 'assets/pages/guide/plain.js',
      // The helper chunk is imported by every page and by nothing else, so no
      // page can rely on the entry to have loaded it.
      js: ['assets/helper.js'],
      css: [],
    })
  })

  it('records the page CSS of a page with its own styles', () => {
    expect(collectPageChunk(manifest, '/src/guide/styled.md', ENTRY_KEY)).toEqual({
      file: 'assets/pages/guide/styled.js',
      js: ['assets/helper.js'],
      css: ['assets/pages/guide/styled.css'],
    })
  })

  it('keeps what the entry already loads out of the extra files', () => {
    const chunk = collectPageChunk(manifest, '/src/guide/plain.md', ENTRY_KEY)

    expect(chunk?.js).not.toContain('assets/app.js')
    expect(chunk?.js).not.toContain('assets/entry-client.js')
  })

  it('returns nothing for a module id the manifest does not know', () => {
    expect(collectPageChunk(manifest, '/src/guide/missing.md', ENTRY_KEY)).toBeUndefined()
  })

  it('accepts Windows separators in module ids', () => {
    expect(collectPageChunk(manifest, '\\src\\guide\\styled.md', ENTRY_KEY)).toEqual({
      file: 'assets/pages/guide/styled.js',
      js: ['assets/helper.js'],
      css: ['assets/pages/guide/styled.css'],
    })
  })
})

describe('collectPageAssets', () => {
  it('preloads the chunks the entry imports statically, transitively', () => {
    expect(collectPageAssets(manifest, undefined, ENTRY_KEY)).toEqual({
      css: ['assets/entry-client.css', 'assets/app.css'],
      modulepreload: ['assets/app.js'],
    })
  })

  it('lists the entry imports before the page chunk', () => {
    const chunk = collectPageChunk(manifest, '/src/guide/plain.md', ENTRY_KEY)

    expect(collectPageAssets(manifest, chunk, ENTRY_KEY)).toEqual({
      css: ['assets/entry-client.css', 'assets/app.css'],
      modulepreload: ['assets/app.js', 'assets/pages/guide/plain.js', 'assets/helper.js'],
    })
  })

  it('adds the page CSS after the entry CSS', () => {
    const chunk = collectPageChunk(manifest, '/src/guide/styled.md', ENTRY_KEY)

    expect(collectPageAssets(manifest, chunk, ENTRY_KEY).css).toEqual([
      'assets/entry-client.css',
      'assets/app.css',
      'assets/pages/guide/styled.css',
    ])
  })

  it('never preloads the entry chunk the script tag already loads', () => {
    const chunk = collectPageChunk(manifest, '/src/guide/plain.md', ENTRY_KEY)

    expect(collectPageAssets(manifest, chunk, ENTRY_KEY).modulepreload)
      .not
      .toContain('assets/entry-client.js')
  })

  it('skips manifest imports that point at a missing chunk', () => {
    const broken = {
      [ENTRY_KEY]: { file: 'assets/entry-client.js', isEntry: true },
      'src/guide/broken.md': {
        file: 'assets/broken.js',
        imports: ['gone.js'],
        css: ['assets/broken.css'],
      },
    }

    expect(collectPageChunk(broken, '/src/guide/broken.md', ENTRY_KEY)).toEqual({
      file: 'assets/broken.js',
      js: [],
      css: ['assets/broken.css'],
    })
    expect(collectPageAssets(broken, { file: 'assets/broken.js', js: [], css: ['assets/broken.css'] }, ENTRY_KEY))
      .toEqual({
        css: ['assets/broken.css'],
        modulepreload: ['assets/broken.js'],
      })
  })

  it('survives a manifest without the entry chunk', () => {
    expect(collectPageAssets({}, undefined, ENTRY_KEY)).toEqual({
      css: [],
      modulepreload: [],
    })
  })
})

describe('toManifestKey', () => {
  it('turns a root-relative module id into a manifest key', () => {
    expect(toManifestKey('/src/guide/intro.md')).toBe('src/guide/intro.md')
    expect(toManifestKey('./src/guide/intro.md')).toBe('src/guide/intro.md')
  })
})
