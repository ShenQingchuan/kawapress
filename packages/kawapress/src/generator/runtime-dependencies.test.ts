import type { UserConfig } from 'vite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  runtimeDependencySpecifiers,
  useRuntimeDependencies,
} from './runtime-dependencies'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root =>
    rm(root, { recursive: true, force: true }),
  ))
})

interface PackageSpec {
  /** Package name, which is also its directory under `node_modules`. */
  name: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  /** Packages installed below this one, the way a package manager nests them. */
  children?: PackageSpec[]
}

/** Builds a throwaway site, and returns its root. */
async function createSite(
  site: { dependencies?: Record<string, string>, devDependencies?: Record<string, string> },
  packages: PackageSpec[] = [],
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'kawapress-deps-'))
  roots.push(root)
  await writeJson(join(root, 'package.json'), { name: 'site', ...site })
  for (const spec of packages) {
    await writePackage(join(root, 'node_modules'), spec)
  }
  return root
}

async function writePackage(parent: string, spec: PackageSpec): Promise<void> {
  const directory = join(parent, spec.name)
  await writeJson(join(directory, 'package.json'), {
    name: spec.name,
    dependencies: spec.dependencies,
    devDependencies: spec.devDependencies,
  })
  for (const child of spec.children ?? []) {
    await writePackage(join(directory, 'node_modules'), child)
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

describe('runtime dependency specifiers', () => {
  it('walks the declared packages from the site to the owner', async () => {
    const root = await createSite({ dependencies: { 'site-framework': '1.0.0' } }, [{
      name: 'site-framework',
      dependencies: { 'theme-preset': '1.0.0' },
      children: [{
        name: 'theme-preset',
        dependencies: { 'scroll-runtime': '1.0.0' },
        children: [{ name: 'scroll-runtime' }],
      }],
    }])

    expect(
      runtimeDependencySpecifiers(root, 'theme-preset', ['scroll-runtime']),
    ).toEqual(['site-framework > theme-preset > scroll-runtime'])
  })

  it('uses the bare name when the site root resolves the dependency itself', async () => {
    const root = await createSite(
      { dependencies: { 'scroll-runtime': '1.0.0' } },
      [{ name: 'scroll-runtime' }],
    )

    expect(
      runtimeDependencySpecifiers(root, 'theme-preset', ['scroll-runtime']),
    ).toEqual(['scroll-runtime'])
  })

  it('declares a subpath through the package that owns it', async () => {
    const root = await createSite({ dependencies: { 'site-framework': '1.0.0' } }, [{
      name: 'site-framework',
      dependencies: { 'theme-preset': '1.0.0' },
      children: [{
        name: 'theme-preset',
        dependencies: { 'head-runtime': '1.0.0' },
        children: [{ name: 'head-runtime' }],
      }],
    }])

    expect(
      runtimeDependencySpecifiers(root, 'theme-preset', ['head-runtime/client']),
    ).toEqual(['site-framework > theme-preset > head-runtime/client'])
  })

  /**
   * A package that is only visible because a package manager hoisted it next to
   * another one is not part of the declared graph. Declaring it as a hop would
   * break in an installation that nests instead of hoisting, so the helper falls
   * back to the name the site root can already resolve.
   */
  it('does not route through a package the owner is only hoisted next to', async () => {
    const root = await createSite({ dependencies: { 'site-framework': '1.0.0' } }, [
      { name: 'site-framework' },
      {
        name: 'theme-preset',
        dependencies: { 'scroll-runtime': '1.0.0' },
        children: [{ name: 'scroll-runtime' }],
      },
    ])

    expect(
      runtimeDependencySpecifiers(root, 'theme-preset', ['scroll-runtime']),
    ).toEqual(['theme-preset > scroll-runtime'])
  })

  it('never invents a specifier it cannot resolve', async () => {
    const root = await createSite({ dependencies: {} })

    expect(
      runtimeDependencySpecifiers(root, 'theme-preset', ['scroll-runtime']),
    ).toEqual([])
  })
})

describe('useRuntimeDependencies', () => {
  it('registers the dependency for the optimizer and for SSR', async () => {
    const root = await createSite({ dependencies: { 'site-framework': '1.0.0' } }, [{
      name: 'site-framework',
      dependencies: { 'theme-preset': '1.0.0' },
      children: [{
        name: 'theme-preset',
        dependencies: { 'scroll-runtime': '1.0.0' },
        children: [{ name: 'scroll-runtime' }],
      }],
    }])

    const config: UserConfig = { root }
    useRuntimeDependencies(config, 'theme-preset', ['scroll-runtime'])

    expect(config.optimizeDeps?.include).toEqual([
      'site-framework > theme-preset > scroll-runtime',
    ])
    expect(config.ssr?.noExternal).toEqual(['scroll-runtime'])
  })

  it('keeps the values another plugin registered before', async () => {
    const root = await createSite(
      { dependencies: { 'scroll-runtime': '1.0.0' } },
      [{ name: 'scroll-runtime' }],
    )
    const config: UserConfig = {
      root,
      optimizeDeps: { include: ['vue'] },
      ssr: { noExternal: ['vue', /^@vue\//] },
    }

    useRuntimeDependencies(config, 'theme-preset', ['scroll-runtime'])

    expect(config.optimizeDeps?.include).toEqual(['vue', 'scroll-runtime'])
    expect(config.ssr?.noExternal).toEqual(['vue', /^@vue\//, 'scroll-runtime'])
  })

  it('adds nothing twice when two plugins declare the same dependency', async () => {
    const root = await createSite(
      { dependencies: { 'scroll-runtime': '1.0.0' } },
      [{ name: 'scroll-runtime' }],
    )
    const config: UserConfig = { root }

    useRuntimeDependencies(config, 'theme-preset', ['scroll-runtime'])
    useRuntimeDependencies(config, 'other-preset', ['scroll-runtime'])

    expect(config.optimizeDeps?.include).toEqual(['scroll-runtime'])
    expect(config.ssr?.noExternal).toEqual(['scroll-runtime'])
  })

  it('leaves noExternal untouched when the site bundles everything', async () => {
    const root = await createSite(
      { dependencies: { 'scroll-runtime': '1.0.0' } },
      [{ name: 'scroll-runtime' }],
    )
    const config: UserConfig = { root, ssr: { noExternal: true } }

    useRuntimeDependencies(config, 'theme-preset', ['scroll-runtime'])

    expect(config.ssr?.noExternal).toBe(true)
    expect(config.optimizeDeps?.include).toEqual(['scroll-runtime'])
  })

  it('only touches the optimizer when nothing resolves', async () => {
    const root = await createSite({ dependencies: {} })
    const config: UserConfig = { root }

    useRuntimeDependencies(config, 'theme-preset', ['scroll-runtime'])

    expect(config.optimizeDeps?.include).toEqual([])
    expect(config.ssr?.noExternal).toEqual(['scroll-runtime'])
  })
})
