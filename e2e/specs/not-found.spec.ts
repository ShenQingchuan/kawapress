import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

const missingPath = '/guide/this-page-does-not-exist'

test('unknown paths answer with the not-found page', async ({ page, request }) => {
  const response = await request.get(sitePath(missingPath))
  expect(response.status()).toBe(404)
  expect(await response.text()).toContain('<h1>404')

  const navigation = await page.goto(sitePath(missingPath))
  expect(navigation?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
  await expect(
    page.locator('.nagi-notfound p'),
    'the not-found page should use the localized message',
  ).toHaveText(/找不到页面|page not found/)
  await expect(page.locator('.nagi-notfound a')).toHaveAttribute(
    'href',
    sitePath('/'),
  )
})
