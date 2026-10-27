import { describe, expect, it } from 'vitest'

import { pseudoTerminalCommand } from './runtime.mjs'
import { buildTrustArguments, formatTrustCommand, isDesiredTrust, parseTrustList, planTrustChange } from './trust.mjs'

describe('buildTrustArguments', () => {
  it('attaches the release workflow as a trusted publisher for one package', () => {
    expect(buildTrustArguments('@kawapress/plugin-comments')).toEqual([
      'trust',
      'github',
      '@kawapress/plugin-comments',
      '--file',
      'release.yml',
      '--repository',
      'kawapress/kawapress',
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
      'npm trust github kawapress --file release.yml --repository kawapress/kawapress --environment npm --allow-publish -y',
    )
  })
})

const current = {
  environment: 'npm',
  file: 'release.yml',
  id: 'id-1',
  permissions: ['createPackage'],
  repository: 'kawapress/kawapress',
  type: 'github',
}

describe('parseTrustList', () => {
  it('reads the objects npm prints one after the other', () => {
    const output = `${JSON.stringify(current, null, 2)}\n${JSON.stringify({ ...current, id: 'id-2' }, null, 2)}`
    expect(parseTrustList(output).map(config => config.id)).toEqual(['id-1', 'id-2'])
  })

  it('returns nothing for an empty output', () => {
    expect(parseTrustList('')).toEqual([])
  })
})

describe('planTrustChange', () => {
  it('does nothing when the right configuration exists', () => {
    expect(isDesiredTrust(current)).toBe(true)
    expect(planTrustChange([current])).toEqual({ create: false, revoke: [] })
  })

  it('creates the configuration when the package has none', () => {
    expect(planTrustChange([])).toEqual({ create: true, revoke: [] })
  })

  it('replaces a configuration that points at another repository', () => {
    const stale = { ...current, id: 'old', repository: 'someone/else' }
    expect(planTrustChange([stale])).toEqual({ create: true, revoke: ['old'] })
  })

  it('replaces a configuration that lost the publish permission or the environment', () => {
    expect(planTrustChange([{ ...current, id: 'a', permissions: [] }])).toEqual({ create: true, revoke: ['a'] })
    expect(planTrustChange([{ ...current, id: 'b', environment: undefined }])).toEqual({ create: true, revoke: ['b'] })
  })

  it('keeps the right one and revokes the extra ones', () => {
    const stale = { ...current, id: 'old', repository: 'someone/else' }
    expect(planTrustChange([stale, current])).toEqual({ create: false, revoke: ['old'] })
  })
})

describe('parseTrustList over a pseudo-terminal', () => {
  it('reads objects whose lines end in CRLF and that follow a prompt', () => {
    const body = JSON.stringify(current, null, 2).replaceAll('\n', '\r\n')
    const output = `Authenticate your account at:\r\nhttps://example.test\r\n${body}\r\n`
    expect(parseTrustList(output)).toHaveLength(1)
    expect(parseTrustList(output)[0].id).toBe('id-1')
  })
})

describe('pseudoTerminalCommand', () => {
  it('wraps the command with script on macOS and Linux, and not elsewhere', () => {
    expect(pseudoTerminalCommand('npm', ['trust', 'list'], 'darwin')).toEqual(['script', ['-q', '/dev/null', 'npm', 'trust', 'list']])
    expect(pseudoTerminalCommand('npm', ['trust', 'list', '@a/b'], 'linux')?.[1]).toEqual(['-qec', `'npm' 'trust' 'list' '@a/b'`, '/dev/null'])
    expect(pseudoTerminalCommand('npm', [], 'win32')).toBeNull()
  })
})
