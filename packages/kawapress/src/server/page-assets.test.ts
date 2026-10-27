import { describe, expect, it } from 'vitest'
import { collectPageAssets, collectPageEntry, toManifestKey } from './page-assets'

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

describe('collectPageEntry', () => {
  it('records a page without own CSS as its file name plus the extra JS', () => {
    // The helper chunk is imported by every page and by nothing else, so no
    // page can rely on the entry to have loaded it.
    expect(collectPageEntry(manifest, '/src/guide/plain.md', ENTRY_KEY)).toEqual([
      'assets/pages/guide/plain.js',
      ['assets/helper.js'],
      [],
    ])
  })

  it('records a page that only needs its own chunk as a plain file name', () => {
    const alone = {
      [ENTRY_KEY]: { file: 'assets/entry-client.js', isEntry: true },
      'src/guide/alone.md': { file: 'assets/alone.js', imports: [ENTRY_KEY] },
    }

    expect(collectPageEntry(alone, '/src/guide/alone.md', ENTRY_KEY)).toBe('assets/alone.js')
  })

  it('records the page CSS of a page with its own styles', () => {
    expect(collectPageEntry(manifest, '/src/guide/styled.md', ENTRY_KEY)).toEqual([
      'assets/pages/guide/styled.js',
      ['assets/helper.js'],
      ['assets/pages/guide/styled.css'],
    ])
  })

  it('keeps what the entry already loads out of the extra files', () => {
    const entry = collectPageEntry(manifest, '/src/guide/plain.md', ENTRY_KEY)

    expect(Array.isArray(entry) ? entry[1] : []).not.toContain('assets/app.js')
    expect(Array.isArray(entry) ? entry[1] : []).not.toContain('assets/entry-client.js')
  })

  it('returns nothing for a module id the manifest does not know', () => {
    expect(collectPageEntry(manifest, '/src/guide/missing.md', ENTRY_KEY)).toBeUndefined()
  })

  it('accepts Windows separators in module ids', () => {
    expect(collectPageEntry(manifest, '\\src\\guide\\stylist.md', ENTRY_KEY))
      .toBeUndefined()
    expect(collectPageEntry(manifest, '\\src\\guide\\styled.md', ENTRY_KEY))
      .toEqual([
        'assets/pages/guide/styled.js',
        ['assets/helper.js'],
        ['assets/pages/guide/styled.css'],
      ])
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
    const entry = collectPageEntry(manifest, '/src/guide/plain.md', ENTRY_KEY)

    expect(collectPageAssets(manifest, entry, ENTRY_KEY)).toEqual({
      css: ['assets/entry-client.css', 'assets/app.css'],
      modulepreload: ['assets/app.js', 'assets/pages/guide/plain.js', 'assets/helper.js'],
    })
  })

  it('adds the page CSS after the entry CSS', () => {
    const entry = collectPageEntry(manifest, '/src/guide/styled.md', ENTRY_KEY)

    expect(collectPageAssets(manifest, entry, ENTRY_KEY).css).toEqual([
      'assets/entry-client.css',
      'assets/app.css',
      'assets/pages/guide/styled.css',
    ])
  })

  it('never preloads the entry chunk the script tag already loads', () => {
    const entry = collectPageEntry(manifest, '/src/guide/plain.md', ENTRY_KEY)

    expect(collectPageAssets(manifest, entry, ENTRY_KEY).modulepreload)
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

    expect(collectPageEntry(broken, '/src/guide/broken.md', ENTRY_KEY)).toEqual([
      'assets/broken.js',
      [],
      ['assets/broken.css'],
    ])
    expect(collectPageAssets(broken, ['assets/broken.js', [], ['assets/broken.css']], ENTRY_KEY))
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
