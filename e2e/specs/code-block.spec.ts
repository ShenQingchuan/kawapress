import type { Page } from '@playwright/test'
import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

// The first tab group and the first code block of this page are stable fixtures
// of the docs content.
const gettingStarted = '/guide/getting-started'

// This page documents code blocks and shows two Twoslash examples at the end of
// its "Type Hints" section.
const twoslashPage = '/guide/markdown-extensions'

/** Floating-vue only ships to pages that render a Twoslash popup. */
const FLOATING_VUE_MARKER = 'v-popper__popper'

test('arrow keys move between code group tabs', async ({ page }) => {
  await page.goto(sitePath(gettingStarted))

  const tabs = page.locator('.kawa-code-group').first().getByRole('tab')
  await expect(tabs).toHaveCount(3)
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')

  await tabs.nth(0).focus()
  await page.keyboard.press('ArrowRight')

  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  await expect(tabs.nth(1)).toBeFocused()
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'false')

  await page.keyboard.press('ArrowLeft')
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
  await expect(tabs.nth(0)).toBeFocused()
})

test('the copy button writes the code to the clipboard', async ({ page }) => {
  await page.goto(sitePath(gettingStarted))

  const block = page.locator('.kawa-code-block').first()
  const code = block.locator('pre code')
  const expected = await code.evaluate((element) => {
    const lines = [...element.children]
      .filter(child => child.classList.contains('line'))
      .map(line => line.textContent ?? '')
    return lines.length > 0 ? lines.join('\n') : (element.textContent ?? '')
  })
  expect(expected).not.toBe('')

  await block.locator('.kawa-code-block__copy').click()

  await expect.poll(
    () => page.evaluate(() => navigator.clipboard.readText()),
  ).toBe(expected)
})

test('a Twoslash token shows its type on hover', async ({ page }) => {
  await page.goto(sitePath(twoslashPage))
  await page.waitForLoadState('networkidle')

  const token = page.locator('pre.twoslash .v-popper.twoslash-hover').first()
  await token.hover()

  const popup = page.locator('.v-popper__popper').filter({ hasText: '(value: number) => string' })
  await expect(popup).toBeVisible()

  // The always visible popup after `// ^?` shows the type of the value.
  const query = page.locator('.v-popper__popper.v-popper--theme-twoslash-query')
  await expect(query).toContainText('const price: string')
})

test('a page without Twoslash does not download floating-vue', async ({ page }) => {
  await page.goto(sitePath(gettingStarted))
  await page.waitForLoadState('networkidle')

  expect(await fetchedFloatingVue(page)).toEqual([])
})

test('a Twoslash page downloads floating-vue', async ({ page }) => {
  await page.goto(sitePath(twoslashPage))
  await page.waitForLoadState('networkidle')

  expect(await fetchedFloatingVue(page)).not.toEqual([])
})

/**
 * Reads every script the page fetched and returns the ones that carry
 * floating-vue, so the check does not depend on chunk names or on how Vite
 * splits the library.
 */
async function fetchedFloatingVue(page: Page): Promise<string[]> {
  return page.evaluate(async (marker) => {
    const urls = performance
      .getEntriesByType('resource')
      .map(entry => entry.name)
      .filter(name => name.endsWith('.js'))
    const bodies = await Promise.all(
      urls.map(url => fetch(url).then(response => response.text())),
    )
    return urls.filter((_, index) => bodies[index].includes(marker))
  }, FLOATING_VUE_MARKER)
}
