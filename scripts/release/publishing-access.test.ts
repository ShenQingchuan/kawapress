import { describe, expect, it } from 'vitest'

import { buildPublishingAccessArguments, formatPublishingAccessCommand } from './publishing-access.mjs'

describe('buildPublishingAccessArguments', () => {
  it('requires two-factor authentication and refuses tokens for one package', () => {
    expect(buildPublishingAccessArguments('@kawapress/preset-nagi')).toEqual([
      'access',
      'set',
      'mfa=publish',
      '@kawapress/preset-nagi',
    ])
  })
})

describe('formatPublishingAccessCommand', () => {
  it('renders a copy-pasteable npm command', () => {
    expect(formatPublishingAccessCommand('kawapress')).toBe('npm access set mfa=publish kawapress')
  })
})
