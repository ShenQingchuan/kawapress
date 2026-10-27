import type { Page } from '@playwright/test'
import { expect, test } from '../../support/fixtures'
import { stubGiscus } from '../../support/giscus'
import { sitePath } from '../../support/site'

/**
 * Plugin styling has to come from the plugin stylesheets plus the public
 * tokens. Nothing here may depend on nagi's private variables, and a token the
 * theme overrides has to reach the plugin elements on its own.
 */
test.beforeEach(async ({ page }) => {
  await stubGiscus(page)
  // Token values differ per color scheme; pin the light one for stable numbers.
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto(sitePath('/'))
})

test('the code block takes its background and border from the public tokens', async ({ page }) => {
  const block = page.locator('.ref-doc .kawa-code-block').first()

  const background = await readStyle(page, '.ref-doc .kawa-code-block', 'backgroundColor')
  expect(background).toBe(await resolveToken(page, '--kawa-c-bg-soft'))

  const borderColor = await readStyle(page, '.ref-doc .kawa-code-block', 'borderTopColor')
  expect(borderColor).toBe(await resolveToken(page, '--kawa-c-divider'))
  await expect(block).toHaveCSS('border-top-width', '1px')
})

test('a custom container is painted by the plugin stylesheet', async ({ page }) => {
  const tip = page.locator('.ref-doc .kawa-container--tip')
  await expect(tip).toHaveCSS('padding-top', '16px')
  await expect(tip).toHaveCSS('border-top-width', '1px')

  const title = await readStyle(page, '.ref-doc .kawa-container--tip .kawa-container__title', 'color')
  expect(title).toBe(await resolveToken(page, '--kawa-c-success'))
})

test('a GitHub alert is painted by the plugin stylesheet', async ({ page }) => {
  const alert = page.locator('.ref-doc .kawa-alert--note')
  await expect(alert).toHaveCSS('padding-top', '16px')
  await expect(alert).toHaveCSS('border-top-width', '1px')

  const title = await readStyle(page, '.ref-doc .kawa-alert--note .kawa-alert__title', 'color')
  expect(title).toBe(await resolveToken(page, '--kawa-c-info'))
})

test('the brand override of the theme reaches a plugin element', async ({ page }) => {
  // #b3005c is the value the theme writes, not the #2f5fbf KawaPress ships, so
  // the assertion below fails if the override never reaches the element.
  expect(await resolveToken(page, '--kawa-c-brand')).toBe('rgb(179, 0, 92)')

  const title = await readStyle(page, '.ref-doc .kawa-container--info .kawa-container__title', 'color')
  expect(title).toBe('rgb(179, 0, 92)')
})

test('the radius override of the theme reaches a plugin element', async ({ page }) => {
  // KawaPress ships 6px, so 10px can only come from the theme.
  expect(await readToken(page, '--kawa-radius')).toBe('10px')
  await expect(page.locator('.ref-doc .kawa-code-block').first()).toHaveCSS('border-radius', '10px')
})

test('no stylesheet of the page mentions a theme private token', async ({ page }) => {
  const offenders = await page.evaluate(() => {
    const rules: string[] = []
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          rules.push(rule.cssText)
        }
      }
      catch {
        // A cross-origin sheet cannot be read; the site serves all of its CSS.
      }
    }
    return rules.filter(text => text.includes('--nagi-'))
  })

  expect(offenders).toEqual([])
})

/** Computed value of one colour property of the first element matching `selector`. */
async function readStyle(
  page: Page,
  selector: string,
  property: 'color' | 'backgroundColor' | 'borderTopColor',
): Promise<string> {
  return page.evaluate(({ selector, property }) => {
    const element = document.querySelector(selector)
    if (!element) {
      throw new Error(`Missing element: ${selector}`)
    }
    return getComputedStyle(element)[property]
  }, { selector, property })
}

/**
 * Reads a `--kawa-*` token from `:root` the way the page sees it. The raw token
 * text (`light-dark()` above all) is put on a throwaway element and read back as
 * a computed colour, so both sides of a comparison share one format.
 */
async function resolveToken(page: Page, token: string): Promise<string> {
  const declaration = await readToken(page, token)

  return page.evaluate((value) => {
    const probe = document.createElement('div')
    probe.style.color = value
    document.body.append(probe)
    const resolved = getComputedStyle(probe).color
    probe.remove()
    return resolved
  }, declaration)
}

/** Raw declaration of a token on `:root`, for example `light-dark(#fff, #000)`. */
async function readToken(page: Page, token: string): Promise<string> {
  const declaration = await page.evaluate(
    name => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    token,
  )
  expect(declaration, `${token} must be declared on :root`).not.toBe('')
  return declaration
}
