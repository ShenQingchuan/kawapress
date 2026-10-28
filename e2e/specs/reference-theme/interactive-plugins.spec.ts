import { expect, test } from '../../support/fixtures'
import { stubGiscus } from '../../support/giscus'
import { sitePath } from '../../support/site'

interface MarkerWindow extends Window {
  /**
   * Anything stored on `window` is lost as soon as the browser loads a new
   * document, so it proves that a navigation stayed inside the app.
   */
  __referenceThemeDocument?: string
}

/**
 * The interactive plugins mount themselves through their runtime plugin and
 * their outlets alone. A theme cannot help them, so working here means working
 * under any theme that follows the contract.
 */
test('Control+K searches the site and Enter opens the second page', async ({ page }) => {
  await stubGiscus(page)
  await page.goto(sitePath('/'))

  await page.keyboard.press('Control+K')
  await expect(page.getByRole('dialog')).toBeVisible()

  const input = page.getByRole('combobox')
  await expect(input).toBeFocused()
  await input.fill('kumquat')

  const results = page.locator('#kawa-search-results li')
  await expect(results.first()).toContainText('Second page')

  await page.keyboard.press('Enter')

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/second$/)
  await expect(page.locator('.ref-doc h1')).toHaveText(/Second page/)
})

test('the LLMS copy button copies the Markdown of the page', async ({ page }) => {
  await stubGiscus(page)
  await page.goto(sitePath('/'))

  await page.locator('.ref-doc .kawa-llms-actions__button--primary').click()

  await expect.poll(
    () => page.evaluate(() => navigator.clipboard.readText()),
  ).toContain('# Reference site')
})

test('the comment thread loads only once the reader scrolls', async ({ page }) => {
  const requests = await stubGiscus(page)
  await page.goto(sitePath('/'))

  const section = page.locator('.ref-doc .kawa-comments')
  await expect(section).toBeVisible()
  expect(requests, 'the script must not load before the reader scrolls').toHaveLength(0)

  await section.scrollIntoViewIfNeeded()

  await expect(page.locator('.ref-doc iframe.giscus-frame')).toHaveCount(1)
  expect(requests).toHaveLength(1)
  await expect(page.locator('.kawa-comments script'))
    .toHaveAttribute('data-repo', 'kawapress/kawapress')
})

test('the image zoom dialog opens on a click and Escape closes it', async ({ page }) => {
  await stubGiscus(page)
  await page.goto(sitePath('/'))

  const image = page.locator('.ref-doc img[data-kawa-zoom]').first()
  await image.click()

  const zoom = page.locator('dialog.kawa-image-zoom')
  await expect(zoom).toBeVisible()
  await expect(zoom).toHaveCSS('opacity', '1')

  await page.keyboard.press('Escape')

  await expect(zoom).toBeHidden()
  await expect(image).toBeFocused()
})

test('the code block copy button writes the code to the clipboard', async ({ page }) => {
  await stubGiscus(page)
  await page.goto(sitePath('/'))

  const block = page.locator('.ref-doc .kawa-code-block').first()
  const code = block.locator('pre code')
  const expected = await code.evaluate((element) => {
    const lines = [...element.children]
      .filter(child => child.classList.contains('line'))
      .map(line => line.textContent ?? '')
    return lines.length > 0 ? lines.join('\n') : (element.textContent ?? '')
  })
  expect(expected).toContain('pnpm install')

  await block.locator('.kawa-code-block__copy').click()

  await expect.poll(
    () => page.evaluate(() => navigator.clipboard.readText()),
  ).toBe(expected)
})

test('arrow keys move between code group tabs', async ({ page }) => {
  await stubGiscus(page)
  await page.goto(sitePath('/'))

  const tabs = page.locator('.ref-doc .kawa-code-group').first().getByRole('tab')
  await expect(tabs).toHaveCount(2)

  await tabs.nth(0).focus()
  await page.keyboard.press('ArrowRight')

  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  await expect(tabs.nth(1)).toBeFocused()

  await page.keyboard.press('ArrowLeft')

  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
})

test('a plain anchor link navigates without loading a new document', async ({ page }) => {
  await stubGiscus(page)
  await page.goto(sitePath('/'))
  await expect(page.locator('.ref-doc h1')).toHaveText(/Reference site/)

  await page.evaluate(() => {
    (window as MarkerWindow).__referenceThemeDocument = 'first document'
  })

  await page.locator('.ref-nav').getByRole('link', { name: 'Second page' }).click()

  await expect(page).toHaveURL(/\/second$/)
  await expect(page.locator('.ref-doc h1')).toHaveText(/Second page/)
  expect(
    await page.evaluate(() => (window as MarkerWindow).__referenceThemeDocument),
    'a full document load would drop the marker',
  ).toBe('first document')
})
