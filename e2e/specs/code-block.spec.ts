import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

// The first tab group and the first code block of this page are stable fixtures
// of the docs content.
const gettingStarted = '/guide/getting-started'

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
