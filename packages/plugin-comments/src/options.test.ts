import { describe, expect, it } from 'vitest'
import { resolveCommentsOptions } from './options'

const GISCUS = {
  repo: 'kawapress/kawapress',
  repoId: 'R_kgDOExample',
  category: 'Comments',
  categoryId: 'DIC_kwDOExample',
}

describe('comments options', () => {
  it('fills in the giscus defaults', () => {
    expect(resolveCommentsOptions({ giscus: GISCUS })).toEqual({
      giscus: {
        ...GISCUS,
        mapping: 'pathname',
        strict: false,
        reactionsEnabled: true,
        inputPosition: 'bottom',
        loading: 'lazy',
      },
      labels: {},
      localeLabels: {},
    })
  })

  it('keeps the overrides the site author wrote', () => {
    const resolved = resolveCommentsOptions({
      giscus: {
        ...GISCUS,
        mapping: 'url',
        strict: true,
        reactionsEnabled: false,
        inputPosition: 'top',
        loading: 'eager',
      },
      labels: { heading: 'Discussion' },
      localeLabels: { en: { heading: 'Talk' } },
    })

    expect(resolved.giscus).toMatchObject({
      mapping: 'url',
      strict: true,
      reactionsEnabled: false,
      inputPosition: 'top',
      loading: 'eager',
    })
    expect(resolved.labels).toEqual({ heading: 'Discussion' })
    expect(resolved.localeLabels).toEqual({ en: { heading: 'Talk' } })
  })

  it('names the missing option, the config path, and the fix', () => {
    expect(() => resolveCommentsOptions(undefined)).toThrowError(
      /plugins: \[commentsPlugin\(\{ giscus: \.\.\. \}\)\] is missing its options\..*https:\/\/giscus\.app/s,
    )
    expect(() => resolveCommentsOptions({} as never)).toThrowError(
      /has no "giscus" section.*https:\/\/giscus\.app/s,
    )
    expect(() => resolveCommentsOptions({
      giscus: { ...GISCUS, repoId: '' },
    })).toThrowError(
      /"giscus\.repoId", received "".*data-repo-id/s,
    )
  })

  it('rejects mappings that need a term written for every page', () => {
    expect(() => resolveCommentsOptions({
      giscus: { ...GISCUS, mapping: 'specific' },
    })).toThrowError(
      /must be one of pathname, url, title, og:title.*"specific" needs a discussion term/s,
    )
  })

  it('rejects unknown enum values', () => {
    expect(() => resolveCommentsOptions({
      giscus: { ...GISCUS, loading: 'idle' as never },
    })).toThrowError(/giscus\.loading" must be one of lazy, eager/)
    expect(() => resolveCommentsOptions({
      giscus: { ...GISCUS, strict: 'yes' as never },
    })).toThrowError(/giscus\.strict" must be true or false/)
  })

  it('rejects an empty heading override', () => {
    expect(() => resolveCommentsOptions({
      giscus: GISCUS,
      labels: { heading: ' ' },
    })).toThrowError(/"labels\.heading" must be a non-empty string, received " "/)
  })

  it('rejects locale labels that are not plain objects', () => {
    expect(() => resolveCommentsOptions({
      giscus: GISCUS,
      localeLabels: [] as never,
    })).toThrowError(/localeLabels" must map a locale key to labels/)
  })
})
