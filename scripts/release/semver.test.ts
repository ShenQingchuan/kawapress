import { describe, expect, it } from 'vitest'

import {
  compareSemver,
  defaultTag,
  findReleaseTagProblem,
  parseSemver,
  validateTag,
} from './semver.mjs'

function compare(left: string, right: string) {
  return compareSemver(parseSemver(left), parseSemver(right))
}

describe('parseSemver', () => {
  it('rejects versions that are not plain semver', () => {
    expect(() => parseSemver('1.0')).toThrow('Invalid semantic version')
    expect(() => parseSemver('v1.0.0')).toThrow('Invalid semantic version')
    expect(() => parseSemver('1.0.0+build')).toThrow('Invalid semantic version')
  })

  it('rejects leading zeroes in numeric prerelease identifiers', () => {
    expect(() => parseSemver('1.0.0-beta.01')).toThrow('Invalid numeric prerelease identifier')
  })

  it('splits the prerelease identifiers', () => {
    expect(parseSemver('0.1.0-beta.1').prerelease).toEqual(['beta', '1'])
  })
})

describe('compareSemver', () => {
  it('orders numeric identifiers numerically and text identifiers lexically', () => {
    expect(compare('0.1.0', '0.0.9')).toBe(1)
    expect(compare('0.1.0-beta.2', '0.1.0-beta.10')).toBe(-1)
    expect(compare('0.1.0-beta', '0.1.0')).toBe(-1)
    expect(compare('0.1.0', '0.1.0')).toBe(0)
  })
})

describe('defaultTag', () => {
  it('uses latest for stable versions', () => {
    expect(defaultTag('0.1.0')).toBe('latest')
  })

  it('uses the prerelease name for known channels', () => {
    expect(defaultTag('0.1.0-beta.1')).toBe('beta')
    expect(defaultTag('0.0.1-rc.2')).toBe('rc')
    expect(defaultTag('0.0.0-bootstrap.0')).toBe('bootstrap')
  })

  it('falls back to next for unknown prerelease names', () => {
    expect(defaultTag('0.1.0-experimental.1')).toBe('next')
  })
})

describe('validateTag', () => {
  it('accepts real dist-tags and rejects versions', () => {
    expect(() => validateTag('latest')).not.toThrow()
    expect(() => validateTag('bootstrap')).not.toThrow()
    expect(() => validateTag('1.0.0')).toThrow('Invalid npm dist-tag')
    expect(() => validateTag('-broken')).toThrow('Invalid npm dist-tag')
  })
})

describe('findReleaseTagProblem', () => {
  it('accepts any tag that starts with v', () => {
    expect(findReleaseTagProblem('v0.3.0')).toBeNull()
    expect(findReleaseTagProblem('v2026-05-30')).toBeNull()
  })

  it('rejects tags the release workflow never handles', () => {
    expect(findReleaseTagProblem('0.3.0')).toContain('must start with "v"')
    expect(findReleaseTagProblem('v')).toContain('must start with "v"')
    expect(findReleaseTagProblem('')).toContain('(empty)')
  })
})
