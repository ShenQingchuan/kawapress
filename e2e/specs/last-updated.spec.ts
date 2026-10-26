import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

test('the doc footer shows the last commit time and the edit link', async ({ page }) => {
  await page.goto(sitePath('/guide/getting-started'))

  const footer = page.locator('.nagi-doc-footer .kawa-last-updated')
  await expect(footer).toBeVisible()

  const time = footer.locator('time')
  await expect(time).toHaveAttribute('datetime', ISO_RE)
  await expect(time).not.toBeEmpty()

  await expect(footer.locator('.kawa-last-updated__label'))
    .toHaveText('最后更新于：')

  const editLink = footer.locator('.kawa-last-updated__edit')
  await expect(editLink).toHaveAttribute(
    'href',
    'https://github.com/ShenQingchuan/kawapress/edit/main/docs/guide/getting-started.md',
  )
  await expect(editLink).toHaveAttribute('target', '_blank')
})

test('the English page uses English text and its own source path', async ({ page }) => {
  await page.goto(sitePath('/en/guide/getting-started'))

  const footer = page.locator('.nagi-doc-footer .kawa-last-updated')
  await expect(footer).toBeVisible()
  await expect(footer.locator('.kawa-last-updated__label'))
    .toHaveText('Last updated: ')
  await expect(footer.locator('.kawa-last-updated__edit')).toHaveAttribute(
    'href',
    'https://github.com/ShenQingchuan/kawapress/edit/main/docs/en/guide/getting-started.md',
  )
})
