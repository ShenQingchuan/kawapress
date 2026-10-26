import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { KAWA_TOKEN_NAMES } from './tokens'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const SHARED_TOKENS = new Set<string>(KAWA_TOKEN_NAMES)

describe('plugin stylesheets', () => {
  it('wrap every rule in the plugin layer and read only shared tokens', async () => {
    const stylesheets = await findPluginStylesheets()
    expect(stylesheets.length).toBeGreaterThan(0)

    for (const { css, fileName, ownVariables } of stylesheets) {
      assertPluginLayer(fileName, css)
      // A theme's private variables and content wrapper are not plugin contract.
      expect(css, `${fileName} reads a theme variable`).not.toMatch(/--nagi-/)
      expect(css, `${fileName} scopes styles to a theme wrapper`).not.toMatch(/\.nagi-/)

      for (const token of customPropertiesReadBy(css)) {
        expect(
          SHARED_TOKENS.has(token) || ownVariables.has(token),
          `${fileName} reads ${token}, which is neither a shared --kawa-* token`
          + ` nor a variable this plugin defines`,
        ).toBe(true)
      }
    }
  })
})

/**
 * A plugin stylesheet either wraps its rules in the plugin layer, or only
 * imports third-party CSS straight into it.
 */
function assertPluginLayer(fileName: string, css: string): void {
  if (css.includes('@layer kawa.plugin {')) {
    expect(css.trimEnd().endsWith('}'), `${fileName} closes its layer`).toBe(true)
    return
  }

  const imports = [...css.matchAll(/@import\b[^;]*;/g)].map(match => match[0])
  expect(imports.length, `${fileName} needs a kawa.plugin layer`).toBeGreaterThan(0)
  for (const statement of imports) {
    expect(statement, `${fileName} imports third-party CSS outside the plugin layer`)
      .toContain('layer(kawa.plugin)')
  }
}

/** Every distinct `var(--x)` reference in the file, in source order. */
function customPropertiesReadBy(css: string): string[] {
  return [...css.matchAll(/var\(\s*(--[\w-]+)/g)]
    .map(match => match[1])
    .filter((token, index, tokens) => tokens.indexOf(token) === index)
}

interface PluginStylesheet {
  css: string
  fileName: string
  /** Variables the plugin itself declares, in CSS or when it renders markup. */
  ownVariables: Set<string>
}

async function findPluginStylesheets(): Promise<PluginStylesheet[]> {
  const packagesDirectory = join(REPO_ROOT, 'packages')
  const packages = await readdir(packagesDirectory, { withFileTypes: true })
  const stylesheets: PluginStylesheet[] = []

  for (const entry of packages) {
    if (!entry.isDirectory() || !entry.name.startsWith('plugin-')) {
      continue
    }
    const sourceDirectory = join(packagesDirectory, entry.name, 'src')
    const files = await readdir(sourceDirectory)
    const ownVariables = new Set<string>()

    for (const file of files) {
      if (!/\.(?:ts|vue)$/.test(file)) {
        continue
      }
      const source = await readFile(join(sourceDirectory, file), 'utf8')
      for (const name of source.matchAll(/(--[\w-]+)/g)) {
        ownVariables.add(name[1])
      }
    }

    for (const file of files.filter(candidate => candidate.endsWith('.css')).sort()) {
      const css = await readFile(join(sourceDirectory, file), 'utf8')
      // Variables the stylesheet declares itself count as plugin-owned too.
      for (const name of css.matchAll(/(--[\w-]+)\s*:/g)) {
        ownVariables.add(name[1])
      }
      stylesheets.push({
        css,
        fileName: relative(REPO_ROOT, join(sourceDirectory, file)),
        ownVariables,
      })
    }
  }

  return stylesheets
}
