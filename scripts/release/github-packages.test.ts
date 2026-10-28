import { describe, expect, it } from 'vitest'

import { githubPublishArgs, isAlreadyPublished, selectGitHubPackages } from './github-packages.mjs'

describe('selectGitHubPackages', () => {
  it('keeps only packages in the @kawapress scope', () => {
    const names = selectGitHubPackages([
      { name: 'kawapress' },
      { name: 'create-kawapress' },
      { name: '@kawapress/preset-nagi' },
    ]).map(packageInfo => packageInfo.name)

    expect(names).toEqual(['@kawapress/preset-nagi'])
  })
})

describe('githubPublishArgs', () => {
  it('targets the GitHub registry without provenance', () => {
    const args = githubPublishArgs({ path: '/tmp/a.tgz', tag: 'latest' }, '/tmp/npmrc')

    expect(args).toContain('https://npm.pkg.github.com/')
    expect(args).toContain('--provenance=false')
    expect(args.slice(0, 2)).toEqual(['publish', '/tmp/a.tgz'])
  })
})

describe('isAlreadyPublished', () => {
  it('recognises the conflict GitHub returns for an existing version', () => {
    expect(isAlreadyPublished({ stderr: 'npm error 409 Conflict - Cannot publish over existing version', stdout: '' })).toBe(true)
    expect(isAlreadyPublished({ stderr: 'npm error 401 Unauthorized', stdout: '' })).toBe(false)
  })
})
