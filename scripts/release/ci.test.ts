import { describe, expect, it } from 'vitest'

import {
  findCiEnvironmentProblems,
  findCommittedVersionProblems,
  formatMissingPackagesError,
  isOidcPublishingAvailable,
} from './ci.mjs'

const taggedEnv = {
  ACTIONS_ID_TOKEN_REQUEST_URL: 'https://pipelines.actions.githubusercontent.com/token',
  GITHUB_ACTIONS: 'true',
  GITHUB_REF_NAME: 'v0.1.0',
  GITHUB_REF_TYPE: 'tag',
  GITHUB_SHA: 'aaaa1111',
}

const taggedRun = {
  env: taggedEnv,
  headCommit: 'aaaa1111',
  tagCommit: 'aaaa1111',
  version: '0.1.0',
}

describe('isOidcPublishingAvailable', () => {
  it('is true only when GitHub exposes the OIDC token endpoint', () => {
    expect(isOidcPublishingAvailable(taggedEnv)).toBe(true)
    expect(isOidcPublishingAvailable({ ACTIONS_ID_TOKEN_REQUEST_URL: '  ' })).toBe(false)
    expect(isOidcPublishingAvailable({})).toBe(false)
  })
})

describe('findCiEnvironmentProblems', () => {
  it('accepts the tagged release commit', () => {
    expect(findCiEnvironmentProblems(taggedRun)).toEqual([])
  })

  it('accepts an annotated tag that points at HEAD', () => {
    expect(findCiEnvironmentProblems({ ...taggedRun, tagCommit: 'aaaa1111' })).toEqual([])
  })

  it('rejects a branch run', () => {
    const problems = findCiEnvironmentProblems({
      ...taggedRun,
      env: { ...taggedEnv, GITHUB_REF_NAME: 'main', GITHUB_REF_TYPE: 'branch' },
    })
    expect(problems.join('\n')).toContain('must run for a tag')
  })

  it('rejects a tag that does not match the release version', () => {
    const problems = findCiEnvironmentProblems({
      ...taggedRun,
      env: { ...taggedEnv, GITHUB_REF_NAME: 'v0.2.0' },
    })
    expect(problems.join('\n')).toContain('does not match release version 0.1.0')
  })

  it('rejects a checkout that is not the commit that triggered the run', () => {
    const problems = findCiEnvironmentProblems({ ...taggedRun, headCommit: 'bbbb2222' })
    expect(problems.join('\n')).toContain('HEAD is bbbb2222')
  })

  it('rejects a missing tag, for example a shallow checkout', () => {
    const problems = findCiEnvironmentProblems({ ...taggedRun, tagCommit: null })
    expect(problems.join('\n')).toContain('is not in this checkout')
  })

  it('rejects a tag that points at another commit', () => {
    const problems = findCiEnvironmentProblems({ ...taggedRun, tagCommit: 'cccc3333' })
    expect(problems.join('\n')).toContain('points at cccc3333')
  })

  it('rejects an OIDC endpoint outside GitHub Actions', () => {
    const problems = findCiEnvironmentProblems({
      ...taggedRun,
      env: { ...taggedEnv, GITHUB_ACTIONS: 'false' },
    })
    expect(problems.join('\n')).toContain('GITHUB_ACTIONS is not "true"')
  })
})

describe('findCommittedVersionProblems', () => {
  it('is happy when the committed version is the release version', () => {
    expect(findCommittedVersionProblems({
      committedVersion: '0.1.0',
      mode: 'publish',
      releaseVersion: '0.1.0',
    })).toEqual([])
  })

  it('tells CI to commit the bump before tagging', () => {
    const problems = findCommittedVersionProblems({
      committedVersion: '0.0.1',
      mode: 'publish',
      releaseVersion: '0.1.0',
    })
    expect(problems.join('\n')).toContain('pnpm release:prepare --version 0.1.0')
  })

  it('words the bootstrap hint around the version that was passed', () => {
    const problems = findCommittedVersionProblems({
      committedVersion: '0.1.0',
      mode: 'bootstrap',
      releaseVersion: '0.0.1',
    })
    expect(problems.join('\n')).toContain('pnpm release --version 0.0.1 --bootstrap')
  })
})

describe('formatMissingPackagesError', () => {
  it('names the packages and points at the bootstrap', () => {
    const message = formatMissingPackagesError(['create-kawapress', '@kawapress/plugin-comments'])
    expect(message).toContain('create-kawapress, @kawapress/plugin-comments')
    expect(message).toContain('release.yml')
    expect(message).toContain('--bootstrap')
    expect(message).toContain('RELEASING.md')
  })
})
