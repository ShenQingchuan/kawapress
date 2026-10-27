import { describe, expect, it } from 'vitest'

import { findMissingPackages, packageExistsOnNpm } from './registry.mjs'

/** Registry stub: `versionByName` maps a package name to its published version, or null. */
function createRunner(versionByName: Record<string, string | null>) {
  const calls: string[] = []
  const runner = async (_command: string, args: string[]) => {
    const name = args[1]
    calls.push(name)
    const version = versionByName[name]
    if (version)
      return { exitCode: 0, stderr: '', stdout: `"${version}"` }
    return {
      exitCode: 1,
      stderr: `npm error code E404\nnpm error 404 Not Found - GET https://registry.npmjs.org/${name}`,
      stdout: '',
    }
  }

  return { calls, runner }
}

describe('findMissingPackages', () => {
  it('returns an empty list when every package exists', async () => {
    const { runner } = createRunner({ kawapress: '0.0.1' })
    await expect(findMissingPackages(['kawapress'], { run: runner as never })).resolves.toEqual([])
  })

  it('names the packages npm does not know', async () => {
    const { runner } = createRunner({
      '@kawapress/plugin-container': '0.0.1',
      'create-kawapress': null,
      'kawapress': '0.0.1',
    })
    await expect(findMissingPackages(
      ['kawapress', 'create-kawapress', '@kawapress/plugin-container'],
      { run: runner as never },
    )).resolves.toEqual(['create-kawapress'])
  })

  it('queries every package exactly once', async () => {
    const { calls, runner } = createRunner({ a: '1.0.0' })
    await findMissingPackages(['a', 'b'], { run: runner as never })
    expect(calls.sort()).toEqual(['a', 'b'])
  })

  it('rethrows registry errors that are not a missing package', async () => {
    const runner = async () => ({
      exitCode: 1,
      stderr: 'npm error code E403\nnpm error 403 Forbidden',
      stdout: '',
    })

    await expect(findMissingPackages(['kawapress'], { run: runner as never }))
      .rejects
      .toThrow('403 Forbidden')
  })
})

describe('packageExistsOnNpm', () => {
  it('is true when npm reports a version', async () => {
    const { runner } = createRunner({ kawapress: '0.0.1' })
    await expect(packageExistsOnNpm('kawapress', { run: runner as never })).resolves.toBe(true)
  })

  it('is false when npm answers 404', async () => {
    const { runner } = createRunner({ 'create-kawapress': null })
    await expect(packageExistsOnNpm('create-kawapress', { run: runner as never })).resolves.toBe(false)
  })
})
