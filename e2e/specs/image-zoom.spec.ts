import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

// The demo images of this page are stable fixtures of the docs content.
const imageZoomPage = '/plugins/image-zoom'
const dialogSelector = 'dialog.kawa-image-zoom'

test('a click opens the zoom dialog and Escape returns focus to the image', async ({ page }) => {
  await page.goto(sitePath(imageZoomPage))

  const image = page.locator('img[data-kawa-zoom]').first()
  await expect(image).toHaveAttribute('role', 'button')
  await expect(image).toHaveAttribute('tabindex', '0')
  await expect(image).toHaveAttribute('aria-label', /^(?:Zoom image|放大图片)/)

  await image.click()

  const zoom = page.locator(dialogSelector)
  await expect(zoom).toBeVisible()
  await expect(zoom).toHaveCSS('opacity', '1')
  const zoomedSource = await zoom.locator('img').evaluate((element) => {
    return (element as HTMLImageElement).src
  })
  expect(zoomedSource).toBe(await image.evaluate(element => (element as HTMLImageElement).src))
  await expect(zoom.locator('figcaption')).toBeVisible()

  await page.keyboard.press('Escape')

  await expect(zoom).toBeHidden()
  await expect(image).toBeFocused()
})

test('a route change closes the dialog', async ({ page }) => {
  await page.goto(sitePath('/plugins/last-updated'))
  await page.getByRole('link', { name: /^(?:图片缩放|Image Zoom)$/ }).click()
  await expect(page).toHaveURL(/image-zoom/)

  const image = page.locator('img[data-kawa-zoom]').first()
  const zoom = page.locator(dialogSelector)
  await image.click()
  await expect(zoom).toBeVisible()

  await page.goBack()

  await expect(page).not.toHaveURL(/image-zoom/)
  await expect(zoom).toBeHidden()
})

test('Enter opens the dialog from the keyboard and a click inside closes it', async ({ page }) => {
  await page.goto(sitePath(imageZoomPage))

  const image = page.locator('img[data-kawa-zoom]').first()
  const zoom = page.locator(dialogSelector)

  await image.focus()
  await page.keyboard.press('Enter')
  await expect(zoom).toBeVisible()

  await zoom.locator('figure').click()
  await expect(zoom).toBeHidden()

  await page.keyboard.press('Space')
  await expect(zoom).toBeVisible()
})

test('an image that opts out stays inert and drops the opt-out hash', async ({ page }) => {
  await page.goto(sitePath(imageZoomPage))

  const optedOut = page.locator('img[alt="不缩放的标志"], img[alt="Logo without zoom"]')
  await expect(optedOut).not.toHaveAttribute('data-kawa-zoom')
  await expect(optedOut).not.toHaveAttribute('role')
  await expect(optedOut).toHaveAttribute('src', /^.*kawapress-logo\.png$/)

  await optedOut.click()

  await expect(page.locator(dialogSelector)).toBeHidden()
})
