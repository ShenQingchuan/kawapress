import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

test('Control+K opens the search and the keyboard selects a result', async ({ page }) => {
  await page.goto(sitePath('/'))

  await page.keyboard.press('Control+K')
  const search = page.getByRole('dialog')
  await expect(search).toBeVisible()

  const input = page.getByRole('combobox')
  await expect(input).toBeFocused()
  await input.fill('路由')

  const results = page.locator('#kawa-search-results li')
  await expect(results.first()).toBeVisible()

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/guide\//)
  await expect(page.locator('article h1')).toBeVisible()
})

test('"/" opens the search and Escape closes it', async ({ page }) => {
  await page.goto(sitePath('/'))

  await page.keyboard.press('/')
  await expect(page.getByRole('dialog')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
