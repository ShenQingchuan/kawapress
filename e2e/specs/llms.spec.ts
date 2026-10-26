import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

test('the generated Markdown files are served under the base', async ({ request }) => {
  const pageMarkdown = await request.get(sitePath('/guide/getting-started.md'))
  expect(pageMarkdown.status()).toBe(200)
  const markdown = await pageMarkdown.text()
  expect(markdown).toContain('# 快速开始')

  const index = await request.get(sitePath('/llms.txt'))
  expect(index.status()).toBe(200)
  const indexText = await index.text()
  expect(indexText).toContain(`](${sitePath('/guide/getting-started.md')})`)

  const full = await request.get(sitePath('/llms-full.txt'))
  expect(full.status()).toBe(200)
  // The full file concatenates every page, so it has to be much larger.
  expect((await full.text()).length).toBeGreaterThan(indexText.length)
})

test('the copy page button sits below the page title', async ({ page }) => {
  await page.goto(sitePath('/guide/getting-started'))

  const actions = page.locator('article .kawa-llms-actions')
  await expect(actions).toBeVisible()

  const followsHeading = await page.evaluate(() => {
    const heading = document.querySelector('article h1')
    const buttons = document.querySelector('article .kawa-llms-actions')
    if (!heading || !buttons) {
      return false
    }
    return Boolean(
      heading.compareDocumentPosition(buttons) & Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })
  expect(
    followsHeading,
    'the Markdown actions must follow the H1 of the page',
  ).toBe(true)
})

test('the copy page button copies the Markdown of the page', async ({ page }) => {
  await page.goto(sitePath('/guide/getting-started'))

  await page.locator('article .kawa-llms-actions__button--primary').click()

  await expect.poll(
    () => page.evaluate(() => navigator.clipboard.readText()),
  ).toContain('# 快速开始')
})
