import type { UserConfig } from 'vite'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'

/**
 * Fields that can lead to a package when the search starts at the site itself.
 * A site normally installs everything it imports, including in
 * `devDependencies`, so all of them count as an entry point of the chain.
 */
const SITE_DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const

/** Fields that can lead to a package from inside a dependency of the site. */
const PACKAGE_DEPENDENCY_FIELDS = [
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
] as const

/** Site, preset and plugin packages make chains of two or three hops long. */
const MAX_CHAIN_LENGTH = 4

/** Guard against a huge site dependency graph turning this into a slow walk. */
const MAX_VISITED_PACKAGES = 500

interface PackageManifest {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

interface ChainCandidate {
  directory: string
  chain: string[]
}

/**
 * Declares the packages that a plugin imports from its runtime code, so both
 * module graphs resolve them from the plugin's own installation instead of from
 * the site root.
 *
 * Sites usually install a preset or `kawapress`, not every package a plugin
 * uses, so a nested dependency cannot be imported by name from the site root.
 * The declaration therefore names the package that owns the dependency and the
 * helper derives the packages that lead from the site to it. Vite's optimizer
 * expects that path as an `owner > dependency` chain.
 *
 * Call it from the `vite()` handler: the client dependency optimizer then
 * pre-bundles these packages before the first request instead of discovering
 * them after it and reloading the page, and the SSR build bundles them so Node
 * never loads a second copy of Vue from `node_modules`.
 *
 * ```ts
 * import { useRuntimeDependencies } from 'kawapress/generator'
 *
 * api.vite((config) => {
 *   useRuntimeDependencies(config, '@your-scope/plugin-name', ['some-browser-lib'])
 * })
 * ```
 */
export function useRuntimeDependencies(
  config: UserConfig,
  owner: string,
  dependencies: readonly string[],
): void {
  const root = resolve(config.root ?? process.cwd())

  config.optimizeDeps ??= {}
  config.optimizeDeps.include = mergeUnique(
    config.optimizeDeps.include,
    runtimeDependencySpecifiers(root, owner, dependencies),
  )

  // A dependency that imports Vue must be bundled by the SSR build, otherwise
  // Node loads its own copy of Vue next to the bundled one.
  const noExternal = config.ssr?.noExternal
  if (noExternal !== true) {
    const existing = noExternal === undefined
      ? []
      : Array.isArray(noExternal) ? noExternal : [noExternal]
    config.ssr ??= {}
    config.ssr.noExternal = mergeUnique(existing, dependencies)
  }
}

/**
 * Specifiers for the client dependency optimizer: bare package names when the
 * site root can already resolve them, otherwise the chain of packages that
 * leads from the site to the owner.
 *
 * KawaPress uses this for the packages its own browser entry imports. Other
 * plugins go through `useRuntimeDependencies()`, which also handles SSR.
 */
export function runtimeDependencySpecifiers(
  root: string,
  owner: string,
  dependencies: readonly string[],
): string[] {
  // The declared path is the most specific answer; the owner on its own and the
  // bare package name are fallbacks for installations the search cannot see
  // through.
  const chains: string[][] = [findOwnerChain(root, owner) ?? [], [owner], []]

  return dependencies.flatMap((dependency) => {
    for (const chain of chains) {
      const specifier = nestedSpecifier(root, chain, dependency)
      if (specifier !== undefined) {
        return [specifier]
      }
    }
    // Nothing resolved: leave the dependency undeclared instead of handing the
    // optimizer an entry it can only warn about.
    return []
  })
}

/**
 * Shortest declared path from the site to `owner`, for example
 * `['kawapress', '@kawapress/preset-nagi']`.
 *
 * Only hops that the parent package declares are followed, so the result also
 * works in a real installation where `node_modules` is not flat. A package that
 * merely happens to be visible through a hoisted `node_modules` is never used as
 * an intermediate.
 */
function findOwnerChain(root: string, owner: string): string[] | undefined {
  const siteManifest = readPackageManifest(root)
  if (siteManifest === undefined) {
    return undefined
  }

  const visited = new Set<string>()
  let frontier: ChainCandidate[] = []

  for (const name of declaredDependencies(siteManifest, SITE_DEPENDENCY_FIELDS)) {
    const directory = findPackageDirectory(name, root)
    if (directory !== undefined) {
      frontier.push({ directory, chain: [name] })
    }
  }

  for (let length = 1; length <= MAX_CHAIN_LENGTH; length++) {
    const next: ChainCandidate[] = []

    for (const candidate of frontier) {
      if (visited.has(candidate.directory)) {
        continue
      }
      visited.add(candidate.directory)
      if (visited.size > MAX_VISITED_PACKAGES) {
        return undefined
      }
      if (candidate.chain.at(-1) === owner) {
        return candidate.chain
      }

      const manifest = readPackageManifest(candidate.directory)
      if (manifest === undefined) {
        continue
      }
      for (const name of declaredDependencies(manifest, PACKAGE_DEPENDENCY_FIELDS)) {
        const directory = findPackageDirectory(name, candidate.directory)
        if (directory !== undefined) {
          next.push({ directory, chain: [...candidate.chain, name] })
        }
      }
    }

    frontier = next
    if (frontier.length === 0) {
      return undefined
    }
  }

  return undefined
}

/**
 * Turns a chain into the specifier Vite wants, but only when every hop resolves
 * from the previous one exactly the way Vite walks it.
 */
function nestedSpecifier(
  root: string,
  chain: readonly string[],
  dependency: string,
): string | undefined {
  let directory = root
  for (const name of chain) {
    const found = findPackageDirectory(name, directory)
    if (found === undefined) {
      return undefined
    }
    directory = found
  }

  // Subpaths such as `@unhead/vue/client` belong to their package directory.
  if (findPackageDirectory(packageNameOf(dependency), directory) === undefined) {
    return undefined
  }
  return [...chain, dependency].join(' > ')
}

/**
 * Directory of an installed package, resolved the way Vite resolves the nested
 * `optimizeDeps.include` syntax: from `from`, then from each parent directory.
 */
function findPackageDirectory(name: string, from: string): string | undefined {
  let directory = from
  while (true) {
    const candidate = join(directory, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) {
      return safeRealpath(candidate)
    }
    const parent = dirname(directory)
    if (parent === directory) {
      return undefined
    }
    directory = parent
  }
}

function readPackageManifest(directory: string): PackageManifest | undefined {
  try {
    return JSON.parse(
      readFileSync(join(directory, 'package.json'), 'utf-8'),
    ) as PackageManifest
  }
  catch {
    return undefined
  }
}

function declaredDependencies(
  manifest: PackageManifest,
  fields: readonly (keyof PackageManifest)[],
): string[] {
  const names = new Set<string>()
  for (const field of fields) {
    const declared = manifest[field]
    if (typeof declared === 'object' && declared !== null) {
      for (const name of Object.keys(declared)) {
        names.add(name)
      }
    }
  }
  return [...names].sort()
}

/** `@scope/package/subpath` becomes `@scope/package`, `package/subpath` becomes `package`. */
function packageNameOf(specifier: string): string {
  const segments = specifier.split('/')
  return specifier.startsWith('@')
    ? segments.slice(0, 2).join('/')
    : segments[0]
}

function safeRealpath(path: string): string {
  try {
    return realpathSync(path)
  }
  catch {
    return path
  }
}

function mergeUnique<T>(existing: readonly T[] | undefined, added: readonly T[]): T[] {
  const merged = [...existing ?? []]
  for (const value of added) {
    if (!merged.includes(value)) {
      merged.push(value)
    }
  }
  return merged
}
