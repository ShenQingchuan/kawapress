import { describe, expect, it } from 'vitest'

import { findPackage, parseBumps, setManifestField } from './packages.mjs'

const manifest = `{
  "name": "create-kawapress",
  "version": "0.0.1",
  "dependencies": {
    "kawapress": "workspace:^"
  },
  "kawapressVersion": "0.0.1"
}
`

function pkg(name: string, version: string) {
  return { directory: `/repo/packages/${name.replace('@kawapress/', '')}`, manifest: { name, version } }
}

const packages = [
  pkg('kawapress', '0.2.0'),
  pkg('@kawapress/plugin-mermaid', '0.2.0'),
  pkg('create-kawapress', '0.2.0'),
]

describe('setManifestField', () => {
  it('rewrites only the field that was asked for', () => {
    const next = setManifestField(manifest, 'version', '0.1.0')
    expect(next).toContain('"version": "0.1.0"')
    expect(next).toContain('"kawapressVersion": "0.0.1"')
  })

  it('leaves dependency ranges and the rest of the file untouched', () => {
    const next = setManifestField(manifest, 'kawapressVersion', '0.1.0')
    expect(next).toContain('"kawapress": "workspace:^"')
    expect(next?.endsWith('}\n')).toBe(true)
  })

  it('reports no change when the value already matches', () => {
    expect(setManifestField(manifest, 'version', '0.0.1')).toBeUndefined()
  })

  it('only touches top-level fields', () => {
    const nested = `{\n  "version": "0.0.1",\n  "nested": {\n    "version": "9.9.9"\n  }\n}\n`
    expect(setManifestField(nested, 'version', '0.1.0')).toContain('"version": "9.9.9"')
  })
})

describe('findPackage', () => {
  it('finds a package by its full npm name', () => {
    expect(findPackage(packages, '@kawapress/plugin-mermaid').manifest.name).toBe('@kawapress/plugin-mermaid')
    expect(findPackage(packages, 'kawapress').manifest.name).toBe('kawapress')
  })

  it('does not accept the directory name or any other short form', () => {
    expect(() => findPackage(packages, 'plugin-mermaid')).toThrow('Use the full npm name')
  })

  it('names the known packages when nothing matches', () => {
    expect(() => findPackage(packages, '@kawapress/nope')).toThrow('Known packages: kawapress, @kawapress/plugin-mermaid, create-kawapress')
  })
})

describe('parseBumps', () => {
  it('maps each package to its new version', () => {
    const bumps = parseBumps(packages, ['kawapress=0.3.0', '@kawapress/plugin-mermaid=0.2.1'])
    expect(bumps.get('kawapress')).toBe('0.3.0')
    expect(bumps.get('@kawapress/plugin-mermaid')).toBe('0.2.1')
  })

  it('rejects a version that is not higher than the current one', () => {
    expect(() => parseBumps(packages, ['kawapress=0.2.0'])).toThrow('already at 0.2.0')
    expect(() => parseBumps(packages, ['kawapress=0.1.9'])).toThrow('already at 0.2.0')
  })

  it('rejects a request without a version, an invalid version, or a repeated package', () => {
    expect(() => parseBumps(packages, ['kawapress'])).toThrow('Expected <package>=<version>')
    expect(() => parseBumps(packages, ['kawapress='])).toThrow('Expected <package>=<version>')
    expect(() => parseBumps(packages, ['kawapress=one'])).toThrow('Invalid semantic version')
    expect(() => parseBumps(packages, ['kawapress=0.3.0', 'kawapress=0.3.1'])).toThrow('listed twice')
  })
})
