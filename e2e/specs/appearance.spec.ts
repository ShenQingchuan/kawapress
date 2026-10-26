import type { Page } from '@playwright/test'
import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

const gettingStarted = '/guide/getting-started'
const appearanceSwitch = /切换明暗模式|Toggle light and dark mode/

function isDark(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.classList.contains('dark'))
}

async function toggleAppearance(page: Page): Promise<boolean> {
  const before = await isDark(page)
  await page.getByRole('button', { name: appearanceSwitch }).click()
  await expect.poll(() => isDark(page)).toBe(!before)
  return !before
}

test('the chosen appearance survives a reload', async ({ page }) => {
  await page.goto(sitePath(gettingStarted))
  const dark = await toggleAppearance(page)

  expect(
    await page.evaluate(() => window.localStorage.getItem('kawapress:appearance')),
  ).toBe(dark ? 'dark' : 'light')

  await page.reload()
  expect(await isDark(page)).toBe(dark)
})

test('the stored appearance is applied before the client hydrates', async ({ page }) => {
  await page.goto(sitePath(gettingStarted))
  const dark = await toggleAppearance(page)

  // Serving an empty client entry leaves the inline initializer script in the
  // prerendered HTML as the only thing that can set the appearance, so this
  // checks the first paint rather than the post-hydration state.
  await page.route(/\/assets\/entry-client-[^/]+\.js$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: '',
  }))

  await page.goto(sitePath(gettingStarted), { waitUntil: 'domcontentloaded' })
  expect(
    await isDark(page),
    'the appearance stored in localStorage must be applied by the prerendered HTML',
  ).toBe(dark)
})
