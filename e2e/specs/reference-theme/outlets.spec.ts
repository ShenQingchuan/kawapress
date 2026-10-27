import { expect, test } from '../../support/fixtures'
import { stubGiscus } from '../../support/giscus'
import { sitePath } from '../../support/site'

// Last updated prints an ISO timestamp in the `datetime` attribute.
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

/**
 * Each outlet of the public contract gets one test. The theme is written from
 * the documented contract alone, so a passing test means a plugin found its
 * socket without any theme-specific glue code.
 *
 * The fixture pages keep their comment section, which loads giscus as soon as
 * it approaches the viewport; the stub keeps the network out of the tests.
 */
test.beforeEach(async ({ page }) => {
  await stubGiscus(page)
})

test('header.actions: the search trigger renders in the theme header', async ({ page }) => {
  await page.goto(sitePath('/'))

  await expect(page.locator('.ref-header .ref-actions .kawa-search-button')).toBeVisible()
})

test('doc.header: the Markdown actions follow the page H1', async ({ page }) => {
  await page.goto(sitePath('/'))

  const actions = page.locator('.ref-doc .kawa-llms-actions')
  await expect(actions).toBeVisible()

  const followsHeading = await page.evaluate(() => {
    const heading = document.querySelector('.ref-doc h1')
    const buttons = document.querySelector('.ref-doc .kawa-llms-actions')
    return heading !== null && buttons !== null && heading.nextElementSibling === buttons
  })
  expect(
    followsHeading,
    'the Markdown actions must sit right after the H1 of the page',
  ).toBe(true)
})

test('doc.footer: the last updated time and the edit link render in the theme footer', async ({ page }) => {
  await page.goto(sitePath('/second'))

  const footer = page.locator('.ref-doc-footer .kawa-last-updated')
  await expect(footer).toBeVisible()

  const time = footer.locator('time')
  await expect(time).toHaveAttribute('datetime', ISO_RE)
  await expect(time).not.toBeEmpty()
  await expect(footer.locator('.kawa-last-updated__label')).toHaveText('Last updated: ')
  await expect(footer.locator('.kawa-last-updated__edit')).toHaveAttribute(
    'href',
    'https://example.com/edit/e2e/fixtures/reference-site/second.md',
  )
})

test('doc.after: the comment section renders below the page content', async ({ page }) => {
  await page.goto(sitePath('/second'))

  const section = page.locator('.ref-doc-after .kawa-comments')
  await expect(section).toBeVisible()
  await expect(section.getByRole('heading', { level: 2 })).toHaveText('Comments')

  const followsContent = await page.evaluate(() => {
    const lastParagraph = document.querySelector('.ref-doc > p:last-of-type')
    const comments = document.querySelector('.ref-doc-after .kawa-comments')
    if (!lastParagraph || !comments) {
      return false
    }
    return Boolean(
      lastParagraph.compareDocumentPosition(comments) & Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })
  expect(followsContent, 'the comments must come after the Markdown content').toBe(true)
})
