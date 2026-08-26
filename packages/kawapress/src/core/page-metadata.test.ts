import type { PageHeader } from './site'
import { describe, expect, it } from 'vitest'
import { resolveDocumentTitle, resolvePageMetadata } from './page-metadata'

const headers: PageHeader[] = [{
  level: 1,
  title: 'From heading',
  slug: 'from-heading',
  link: '#from-heading',
  children: [],
}]

describe('page metadata', () => {
  it('uses frontmatter metadata for a page title and description', () => {
    const metadata = resolvePageMetadata({
      title: 'Frontmatter title',
      description: 'A short description.',
      titleTemplate: '%s · KawaPress',
    }, headers)

    expect(metadata).toEqual({
      title: 'Frontmatter title',
      description: 'A short description.',
      titleTemplate: '%s · KawaPress',
    })
    expect(resolveDocumentTitle(metadata, 'KawaPress')).toBe(
      'Frontmatter title · KawaPress',
    )
  })

  it('falls back safely when known metadata values use another type', () => {
    const frontmatter = {
      title: 42,
      description: ['not', 'a', 'description'],
      titleTemplate: true,
    }

    const metadata = resolvePageMetadata(frontmatter, headers)

    expect(metadata).toEqual({ title: 'From heading' })
    expect(frontmatter.title).toBe(42)
  })

  it('uses only the page title when the title template is false', () => {
    expect(resolveDocumentTitle({
      title: 'Standalone title',
      titleTemplate: false,
    }, 'KawaPress')).toBe('Standalone title')
  })
})
