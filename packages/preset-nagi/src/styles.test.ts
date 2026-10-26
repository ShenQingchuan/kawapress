import { readFile } from 'node:fs/promises'
import { KAWA_TOKEN_NAMES } from 'kawapress'
import { describe, expect, it } from 'vitest'

/**
 * `preflight.css` is the one stylesheet nagi contributes to `kawa.base`: a
 * normalization every plugin's own styles must be able to override.
 */
const PREFLIGHT = 'preflight.css'
const PREFLIGHT_LAYER = '@layer kawa.base {'
const THEME_LAYER = '@layer kawa.theme {'

describe('nagi theme styles', () => {
  it('keeps theme styles in the theme layer and preflight in the base layer', async () => {
    const files = await themeStylesheetNames()
    expect(files.length).toBeGreaterThan(1)

    for (const file of files) {
      const css = await readThemeStylesheet(file)
      const layer = file === PREFLIGHT ? PREFLIGHT_LAYER : THEME_LAYER

      expect(css, `${file} needs a ${layer} block`).toContain(layer)
      expect(css.trimEnd().endsWith('}'), `${file} closes its layer`).toBe(true)
    }
  })

  it('maps every shared token onto the nagi palette in one place', async () => {
    const vars = await readThemeStylesheet('vars.css')

    for (const token of KAWA_TOKEN_NAMES) {
      expect(vars, `vars.css maps ${token}`).toContain(`\n    ${token}: `)
    }
    // Plugin-specific variables belong to the plugins, not to the theme.
    expect(vars).not.toMatch(/--kawa-search-/)
    expect(vars).not.toMatch(/--twoslash-/)
    expect(vars).not.toMatch(/--kawa-container-accent:/)
  })

  it('imports third-party CSS into the theme layer', async () => {
    const theme = await readThemeStylesheet('../theme.css')

    expect(theme).toContain(
      '@import url(\'overlayscrollbars/styles/overlayscrollbars.css\') layer(kawa.theme);',
    )
  })
})

/** The stylesheets `theme.css` pulls in, so this test follows the real entry. */
async function themeStylesheetNames(): Promise<string[]> {
  const theme = await readThemeStylesheet('../theme.css')
  return [...theme.matchAll(/@import '\.\/styles\/([\w-]+\.css)'/g)]
    .map(match => match[1])
}

function readThemeStylesheet(file: string): Promise<string> {
  return readFile(new URL(`styles/${file}`, import.meta.url), 'utf8')
}
