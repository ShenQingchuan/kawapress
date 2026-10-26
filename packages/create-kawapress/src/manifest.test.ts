import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { kawapressVersion, scaffolderVersion } from './manifest'

async function readManifest(relativePath: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), 'utf8'))
}

describe('manifest', () => {
  it('exposes the scaffolder version', () => {
    expect(scaffolderVersion).toBe('0.0.1')
  })

  it('keeps kawapressVersion equal to the kawapress package version', async () => {
    const kawapressManifest = await readManifest('../../kawapress/package.json')

    expect(kawapressVersion).toBe(kawapressManifest.version)
  })

  it('reads kawapressVersion from the published manifest', async () => {
    const manifest = await readManifest('../package.json')

    expect(manifest.kawapressVersion).toBe(kawapressVersion)
  })
})
