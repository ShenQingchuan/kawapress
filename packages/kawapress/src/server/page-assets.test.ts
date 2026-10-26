import { describe, expect, it } from 'vitest'
import { collectPageAssets } from './page-assets'

const ENTRY_KEY = '../packages/kawapress/src/client/entries/entry-client.ts'

const manifest = {
  [ENTRY_KEY]: {
    file: 'assets/entry-client.js',
    isEntry: true,
    css: ['assets/entry-client.css'],
  },
  '__helper.js': {
    file: 'assets/helper.js',
  },
  '_shared.js': {
    file: 'assets/shared.js',
    css: ['assets/shared.css'],
  },
  'guide/getting-started.md': {
    file: 'assets/getting-started.js',
    isDynamicEntry: true,
    imports: [ENTRY_KEY, '__helper.js'],
  },
  'guide/styled.md': {
    file: 'assets/styled.js',
    isDynamicEntry: true,
    css: ['assets/styled.css'],
    imports: [ENTRY_KEY, '_shared.js'],
  },
  'guide/deep.md': {
    file: 'assets/deep.js',
    isDynamicEntry: true,
    imports: ['_shared.js'],
  },
  'guide/lazy.md': {
    file: 'assets/lazy.js',
    isDynamicEntry: true,
    css: ['assets/lazy.css'],
    imports: [ENTRY_KEY],
    dynamicImports: ['_heavy.js'],
  },
  '_heavy.js': {
    file: 'assets/heavy.js',
    css: ['assets/heavy.css'],
  },
}

describe('collectPageAssets', () => {
  it('links the entry CSS for a page that owns no chunk', () => {
    expect(collectPageAssets(manifest, [], ENTRY_KEY)).toEqual({
      css: ['assets/entry-client.css'],
      modulepreload: [],
    })
  })

  it('adds the CSS and the JS of the rendered page chunk', () => {
    expect(
      collectPageAssets(manifest, ['guide/styled.md'], ENTRY_KEY),
    ).toEqual({
      css: [
        'assets/entry-client.css',
        'assets/styled.css',
        'assets/shared.css',
      ],
      modulepreload: ['assets/styled.js', 'assets/shared.js'],
    })
  })

  it('walks static imports transitively and keeps each file once', () => {
    const assets = collectPageAssets(
      manifest,
      ['guide/styled.md', 'guide/deep.md'],
      ENTRY_KEY,
    )

    expect(assets.css).toEqual([
      'assets/entry-client.css',
      'assets/styled.css',
      'assets/shared.css',
    ])
    expect(assets.modulepreload).toEqual([
      'assets/styled.js',
      'assets/deep.js',
      'assets/shared.js',
    ])
  })

  it('ignores dynamic imports', () => {
    const assets = collectPageAssets(manifest, ['guide/lazy.md'], ENTRY_KEY)

    expect(assets.css).toEqual(['assets/entry-client.css', 'assets/lazy.css'])
    expect(assets.modulepreload).toEqual(['assets/lazy.js'])
  })

  it('skips module ids that are not manifest keys', () => {
    const assets = collectPageAssets(
      manifest,
      ['../packages/preset-nagi/src/components/Layout.vue', 'guide/missing.md'],
      ENTRY_KEY,
    )

    expect(assets).toEqual({
      css: ['assets/entry-client.css'],
      modulepreload: [],
    })
  })

  it('skips manifest imports that point at a missing chunk', () => {
    const broken = {
      [ENTRY_KEY]: {
        file: 'assets/entry-client.js',
        isEntry: true,
        css: ['assets/entry-client.css'],
      },
      'guide/broken.md': {
        file: 'assets/broken.js',
        imports: ['gone.js'],
        css: ['assets/broken.css'],
      },
    }

    expect(collectPageAssets(broken, ['guide/broken.md'], ENTRY_KEY)).toEqual({
      css: ['assets/entry-client.css', 'assets/broken.css'],
      modulepreload: ['assets/broken.js'],
    })
  })

  it('never preloads the entry chunk the script tag already loads', () => {
    const assets = collectPageAssets(
      manifest,
      ['guide/getting-started.md'],
      ENTRY_KEY,
    )

    expect(assets.modulepreload).not.toContain('assets/entry-client.js')
    expect(assets.css).toEqual(['assets/entry-client.css'])
  })

  it('accepts Windows separators in module ids', () => {
    expect(
      collectPageAssets(manifest, ['guide\\styled.md'], ENTRY_KEY).css,
    ).toContain('assets/styled.css')
  })

  it('survives a manifest without the entry chunk', () => {
    expect(collectPageAssets({}, [], ENTRY_KEY)).toEqual({
      css: [],
      modulepreload: [],
    })
  })
})

/**
 * The entry chunk of a built site imports the app chunk and the page manifest
 * chunk statically, so a page never waits for a second round trip to discover
 * them. A site that keeps everything in the entry chunk has no such imports.
 */
const splitManifest = {
  [ENTRY_KEY]: {
    file: 'assets/entry-client.js',
    isEntry: true,
    css: ['assets/entry-client.css'],
    imports: ['_app.js'],
  },
  '_app.js': {
    file: 'assets/app.js',
    css: ['assets/app.css'],
    imports: ['_manifest.js'],
  },
  '_manifest.js': {
    file: 'assets/page-manifest.js',
  },
  'index.md': {
    file: 'assets/index.js',
    isDynamicEntry: true,
    imports: [ENTRY_KEY],
  },
}

describe('collectPageAssets with a split entry chunk', () => {
  it('preloads the chunks the entry imports statically, transitively', () => {
    expect(collectPageAssets(splitManifest, [], ENTRY_KEY)).toEqual({
      css: ['assets/entry-client.css', 'assets/app.css'],
      modulepreload: ['assets/app.js', 'assets/page-manifest.js'],
    })
  })

  it('lists the entry imports before the page chunks', () => {
    const assets = collectPageAssets(splitManifest, ['index.md'], ENTRY_KEY)

    expect(assets.modulepreload).toEqual([
      'assets/app.js',
      'assets/page-manifest.js',
      'assets/index.js',
    ])
  })

  it('keeps the entry chunk itself out of the preloads', () => {
    expect(collectPageAssets(splitManifest, ['index.md'], ENTRY_KEY).modulepreload)
      .not
      .toContain('assets/entry-client.js')
  })
})
