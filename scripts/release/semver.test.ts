import { describe, expect, it } from 'vitest'

import {
  compareSemver,
  defaultTag,
  parseSemver,
  tagNameForVersion,
  validateTag,
  versionFromTagName,
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

describe('release tags', () => {
  it('maps a version to its Git tag and back', () => {
    expect(tagNameForVersion('0.1.0')).toBe('v0.1.0')
    expect(versionFromTagName('v0.1.0')).toBe('0.1.0')
  })

  it('rejects tags that are not v prefixed', () => {
    expect(() => versionFromTagName('0.1.0')).toThrow('Release tags must look like v1.2.3')
    expect(() => versionFromTagName('v')).toThrow('Release tags must look like v1.2.3')
  })
})
