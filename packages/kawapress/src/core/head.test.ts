import type { HeadConfig } from './head'
import { createHead } from '@unhead/vue/server'
import { describe, expect, it } from 'vitest'
import { headConfigToUnheadInput, resolveHeadConfig } from './head'

const siteSource = { owner: 'the site config', path: 'head' }
const localeSource = { owner: 'locale "en" in the site config', path: 'locales.en.head' }

function failure(run: () => unknown): string {
  try {
    run()
  }
  catch (error) {
    return (error as Error).message
  }
  throw new Error('expected the head config to be rejected')
}

async function renderHead(...sources: HeadConfig[][]): Promise<string> {
  const head = createHead()
  for (const source of sources) {
    head.push(headConfigToUnheadInput(source))
  }
  const { headTags } = await head.render()
  return headTags
}

describe('resolveHeadConfig', () => {
  it('treats a missing head as an empty list', () => {
    expect(resolveHeadConfig(undefined, siteSource)).toEqual([])
    expect(resolveHeadConfig(null, siteSource)).toEqual([])
  })

  it('keeps valid head tags as JSON data', () => {
    const head: HeadConfig[] = [
      ['meta', { property: 'og:image', content: '/social.png' }],
      ['link', { rel: 'icon', href: '/favicon.ico' }],
      ['script', { src: 'https://example.com/a.js', defer: true }],
      ['style', {}, 'body { color: red }'],
      ['noscript', {}, '<img src="/pixel.png" alt="">'],
    ]

    expect(resolveHeadConfig(head, siteSource)).toEqual(head)
  })

  it('reports a head value that is not a list', () => {
    const message = failure(() => resolveHeadConfig('nope', siteSource))

    expect(message).toContain('KawaPress: invalid head config in the site config.')
    expect(message).toContain('head must be an array of head tags, got the string "nope".')
  })

  it('reports an entry that is not a tuple', () => {
    const message = failure(() => resolveHeadConfig([{ tag: 'meta' }], siteSource))

    expect(message).toContain('head[0] must be a head tag tuple, got an object.')
  })

  it('reports a tuple with the wrong number of elements', () => {
    const message = failure(() => resolveHeadConfig([['meta']], siteSource))

    expect(message).toContain('head[0] must have 2 or 3 elements, got 1.')
  })

  it('rejects tag names outside the supported list', () => {
    const message = failure(() => resolveHeadConfig([['iframe', {}]], siteSource))

    expect(message).toContain('head[0][0] must be one of "meta", "link", "script", "style", "noscript", got the string "iframe".')
  })

  it('rejects title and base with a hint about the managed tags', () => {
    const title = failure(() => resolveHeadConfig([['title', {}]], siteSource))
    const base = failure(() => resolveHeadConfig([['base', { href: '/x/' }]], siteSource))

    expect(title).toContain('got the string "title".')
    expect(title).toContain('KawaPress builds <title> from the page title')
    expect(title).toContain('Remove this entry from head.')
    expect(base).toContain('KawaPress builds <base> from the site "base" config')
  })

  it('reports an attribute object that is not a plain object', () => {
    const message = failure(() => resolveHeadConfig([['meta', ['name']]], siteSource))

    expect(message).toContain('head[0][1] must be an object of attributes like { "name": "description" }, got an array.')
  })

  it('reports an attribute value that is neither a string nor a boolean', () => {
    const message = failure(() => resolveHeadConfig([
      ['link', { rel: 'icon', href: '/favicon.ico' }],
      ['meta', { charset: 'utf-8' }],
      ['meta', { name: 'description', content: 42 }],
    ], siteSource))

    expect(message).toContain('head[2][1].content must be a string or boolean, got the number 42.')
  })

  it('reports content that is not a string', () => {
    const message = failure(() => resolveHeadConfig([['script', {}, 42]], siteSource))

    expect(message).toContain('head[0][2] must be the tag content as a string, got the number 42.')
  })

  it('rejects inner content on empty elements', () => {
    const meta = failure(() => resolveHeadConfig([['meta', { name: 'robots' }, 'noindex']], siteSource))
    const link = failure(() => resolveHeadConfig([['link', { rel: 'icon', href: '/a.ico' }, 'x']], siteSource))

    expect(meta).toContain('head[0][2] is not supported: <meta> is an empty element and cannot hold content.')
    expect(link).toContain('<link> is an empty element and cannot hold content.')
  })

  it('uses the locale config path in its messages', () => {
    const message = failure(() => resolveHeadConfig([['link', 'nope']], localeSource))

    expect(message).toContain('KawaPress: invalid head config in locale "en" in the site config.')
    expect(message).toContain('locales.en.head[0][1] must be an object of attributes')
  })
})

describe('headConfigToUnheadInput', () => {
  it('groups tags by name and turns the third element into inner content', () => {
    expect(headConfigToUnheadInput([
      ['meta', { property: 'og:image', content: '/social.png' }],
      ['link', { rel: 'preconnect', href: 'https://example.com' }],
      ['script', { src: 'https://example.com/a.js', defer: true }],
      ['style', { media: 'screen' }, 'body { color: red }'],
      ['noscript', {}, '<img src="/pixel.png" alt="">'],
    ])).toEqual({
      meta: [{ property: 'og:image', content: '/social.png' }],
      link: [{ rel: 'preconnect', href: 'https://example.com' }],
      script: [{ src: 'https://example.com/a.js', defer: true }],
      style: [{ media: 'screen', innerHTML: 'body { color: red }' }],
      noscript: [{ innerHTML: '<img src="/pixel.png" alt="">' }],
    })
  })

  it('returns an empty input for an empty head', () => {
    expect(headConfigToUnheadInput([])).toEqual({})
  })
})

describe('head rendering order', () => {
  it('renders site, locale, and page tags in that order', async () => {
    const headTags = await renderHead(
      [['meta', { name: 'site-tag', content: 'site' }]],
      [['meta', { name: 'locale-tag', content: 'locale' }]],
      [['meta', { name: 'page-tag', content: 'page' }]],
    )

    expect(headTags.indexOf('site-tag')).toBeLessThan(headTags.indexOf('locale-tag'))
    expect(headTags.indexOf('locale-tag')).toBeLessThan(headTags.indexOf('page-tag'))
  })

  it('lets a page meta override a site meta with the same property', async () => {
    const headTags = await renderHead(
      [['meta', { property: 'og:image', content: '/site.png' }]],
      [['meta', { property: 'og:image', content: '/page.png' }]],
    )

    expect(headTags).toContain('content="/page.png"')
    expect(headTags).not.toContain('/site.png')
    expect(headTags.match(/og:image/g)).toHaveLength(1)
  })

  it('lets a locale meta override a site meta with the same name', async () => {
    const headTags = await renderHead(
      [['meta', { name: 'description', content: 'Site description' }]],
      [['meta', { name: 'description', content: 'Locale description' }]],
      [],
    )

    expect(headTags).toContain('content="Locale description"')
    expect(headTags).not.toContain('Site description')
  })
})
