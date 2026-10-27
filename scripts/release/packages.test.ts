import { describe, expect, it } from 'vitest'
import { bumpManifestVersions } from './packages.mjs'

const manifest = `{
  "name": "create-kawapress",
  "version": "0.0.1",
  "dependencies": {
    "kawapress": "workspace:*"
  },
  "kawapressVersion": "0.0.1"
}
`

describe('bumpManifestVersions', () => {
  it('moves the package version and the scaffolded kawapress version together', () => {
    expect(bumpManifestVersions(manifest, '0.1.0')).toBe(
      manifest.replaceAll('"0.0.1"', '"0.1.0"'),
    )
  })

  it('leaves dependency ranges and the rest of the file untouched', () => {
    const next = bumpManifestVersions(manifest, '0.1.0')
    expect(next).toContain('"kawapress": "workspace:*"')
    expect(next?.endsWith('}\n')).toBe(true)
  })

  it('reports no change when the versions already match', () => {
    expect(bumpManifestVersions(manifest.replaceAll('0.0.1', '0.1.0'), '0.1.0')).toBeUndefined()
  })

  it('only touches top-level fields', () => {
    const nested = `{\n  "version": "0.0.1",\n  "nested": {\n    "version": "9.9.9"\n  }\n}\n`
    expect(bumpManifestVersions(nested, '0.1.0')).toContain('"version": "9.9.9"')
  })
})
