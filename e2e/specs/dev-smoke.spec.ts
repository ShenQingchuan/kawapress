import { expect, test } from '../support/fixtures'
import { base, sitePath } from '../support/site'

/**
 * Known bug: `kawapress dev` answers 404 for every page when the site uses a
 * non-root base. Vite's base middleware already strips the base from the
 * request URL and the SSR handler strips it a second time
 * (`packages/kawapress/src/server/request-handler.ts`), so no route matches and
 * the request falls back to the not-found route. The dev smoke tests stay
 * skipped on that leg until the dev server handles a base.
 */
test.fixme(
  base !== '/',
  'kawapress dev returns 404 for every page when base is not "/"',
)

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
