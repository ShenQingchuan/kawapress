import { describe, expect, it } from 'vitest'
import { createEditLink, toRepositoryPath, validateEditLinkPattern } from './edit-link'

describe('edit link', () => {
  it('fills the placeholder with the repository path', () => {
    expect(createEditLink(
      'https://github.com/o/r/edit/main/:path',
      'docs/guide/intro.md',
    )).toBe('https://github.com/o/r/edit/main/docs/guide/intro.md')
  })

  it('rejects a pattern that cannot place the source path', () => {
    expect(() => validateEditLinkPattern('https://github.com/o/r'))
      .toThrow(/editLink\.pattern.*:path/s)
  })

  it('writes the path relative to the repository root with encoded segments', () => {
    expect(toRepositoryPath('/repo/docs/guide intro.md', '/repo'))
      .toBe('docs/guide%20intro.md')
    expect(toRepositoryPath('/repo/guide.md', '/repo')).toBe('guide.md')
  })

  it('ignores files outside the repository', () => {
    expect(toRepositoryPath('/other/guide.md', '/repo')).toBeUndefined()
    expect(toRepositoryPath('/repo', '/repo')).toBeUndefined()
  })
})
