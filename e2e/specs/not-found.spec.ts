import { expect, test } from '../support/fixtures'
import { previewOrigin, sitePath } from '../support/site'

const missingPath = '/guide/this-page-does-not-exist'
const missingEnglishPath = '/en/guide/this-page-does-not-exist'

/**
 * `404.html` is prerendered once, at `/404`, and served for every unknown URL.
 * The client therefore hydrates the route it was rendered with and only then
 * switches to the requested URL: the markup stays identical (no hydration
 * warnings, which the console guard fixture already fails on) and the address
 * bar keeps the requested URL the whole time.
 */
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
  await expect(
    page.locator('.nagi-language-menu__link[lang="en"]'),
    'the language link should point at the requested path, not at the prerendered one',
  ).toHaveAttribute('href', sitePath(missingEnglishPath))
  await expect(page).toHaveURL(`${previewOrigin}${sitePath(missingPath)}`)
})

test('a missing page under a locale keeps that locale', async ({ page }) => {
  const navigation = await page.goto(sitePath(missingEnglishPath))
  expect(navigation?.status()).toBe(404)
  await expect(
    page.locator('.nagi-notfound p'),
    'the not-found page of the English locale should use English texts',
  ).toHaveText(/page not found/i)
  await expect(page.locator('.nagi-notfound a')).toHaveAttribute(
    'href',
    sitePath('/en'),
  )
  await expect(
    page.locator('.nagi-language-menu__link[lang="zh-CN"]'),
  ).toHaveAttribute('href', sitePath(missingPath))
  await expect(page).toHaveURL(`${previewOrigin}${sitePath(missingEnglishPath)}`)
})
