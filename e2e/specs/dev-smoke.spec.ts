import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

interface MarkerWindow extends Window {
  __kawapressE2eMarker?: string
}

test('the dev server renders the home page', async ({ page }) => {
  const response = await page.goto(sitePath('/'))
  expect(response?.status()).toBe(200)
  await expect(page.locator('#app h1').first()).toBeVisible()
})

test('the dev server renders a guide page', async ({ page }) => {
  const response = await page.goto(sitePath('/guide/getting-started'))
  expect(response?.status()).toBe(200)
  await expect(page.locator('article h1')).toContainText('快速开始')
})

test('sidebar links navigate on the client in dev', async ({ page }) => {
  await page.goto(sitePath('/guide/getting-started'))
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => {
    (window as MarkerWindow).__kawapressE2eMarker = 'kept'
  })

  await page
    .locator('.nagi-sidebar--desktop')
    .getByRole('link', { name: '路由', exact: true })
    .click()

  await expect(page.locator('article h1')).toContainText('路由')
  expect(
    await page.evaluate(() => (window as MarkerWindow).__kawapressE2eMarker),
  ).toBe('kept')
})
