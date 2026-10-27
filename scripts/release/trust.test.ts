import { describe, expect, it } from 'vitest'

import { buildTrustArguments, formatTrustCommand } from './trust.mjs'

describe('buildTrustArguments', () => {
  it('attaches the release workflow as a trusted publisher for one package', () => {
    expect(buildTrustArguments('@kawapress/plugin-comments')).toEqual([
      'trust',
      'github',
      '@kawapress/plugin-comments',
      '--file',
      'release.yml',
      '--repository',
      'ShenQingchuan/kawapress',
      '--environment',
      'npm',
      '--allow-publish',
      '-y',
    ])
  })
})

describe('formatTrustCommand', () => {
  it('renders a copy-pasteable npm command', () => {
    expect(formatTrustCommand('kawapress')).toBe(
      'npm trust github kawapress --file release.yml --repository ShenQingchuan/kawapress --environment npm --allow-publish -y',
    )
  })
})
