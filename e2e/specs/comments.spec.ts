import type { Page } from '@playwright/test'
import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

const commentsSection = '.kawa-comments'
const giscusFrame = '.kawa-comments iframe.giscus-frame'
const giscusScript = '.kawa-comments script'

/**
 * The real giscus script renders a cross-origin iframe, which no test can
 * inspect. This stub does the same DOM work with the same class name, so the
 * spec can assert when the script is requested and which attributes it carries.
 */
const GISCUS_STUB_SCRIPT = `
(() => {
  const host = document.querySelector('.kawa-comments__thread')
  if (!host) {
    return
  }
  const frame = document.createElement('iframe')
  frame.className = 'giscus-frame'
  frame.title = 'Comments'
  host.append(frame)
})()
`

test('giscus is only requested once the section approaches the viewport', async ({ page }) => {
  const requests = await stubGiscus(page)
  await page.goto(sitePath('/'))

  const section = page.locator(commentsSection)
  await expect(section.getByRole('heading', { level: 2 })).toHaveText('Comments')
  expect(requests, 'the script must not load before the reader scrolls').toHaveLength(0)

  await section.scrollIntoViewIfNeeded()

  await expect(page.locator(giscusFrame)).toHaveCount(1)
  expect(requests).toHaveLength(1)
  await expect(page.locator(giscusScript)).toHaveAttribute('data-repo', 'kawapress/kawapress')
  await expect(page.locator(giscusScript)).toHaveAttribute('data-mapping', 'pathname')
  await expect(page.locator(giscusScript)).toHaveAttribute('data-lang', 'en')
})

test('the thread follows the appearance of the site', async ({ page }) => {
  await stubGiscus(page)
  await page.goto(sitePath('/'))
  await page.locator(commentsSection).scrollIntoViewIfNeeded()

  const script = page.locator(giscusScript)
  await expect(script).toHaveAttribute('data-theme', 'light')

  await page.evaluate(() => {
    document.documentElement.classList.remove('light')
    document.documentElement.classList.add('dark')
  })

  await expect(script).toHaveAttribute('data-theme', 'dark')
})

test('another page shows its own discussion', async ({ page }) => {
  const requests = await stubGiscus(page)
  await page.goto(sitePath('/'))
  await page.locator(commentsSection).scrollIntoViewIfNeeded()
  await expect(page.locator(giscusFrame)).toHaveCount(1)
  expect(requests).toHaveLength(1)

  await page.getByRole('link', { name: 'Open the second page' }).click()
  await expect(page.locator('article h1')).toContainText('Second page')

  await expect
    .poll(() => requests.length, { message: 'the new page loads its own thread' })
    .toBe(2)
  await expect(page.locator(giscusFrame)).toHaveCount(1)
})

test('frontmatter comments: false hides the section', async ({ page }) => {
  const requests = await stubGiscus(page)
  await page.goto(sitePath('/opt-out'))

  await expect(page.locator('article h1')).toContainText('Page without comments')
  await expect(page.locator(commentsSection)).toHaveCount(0)

  await page.mouse.wheel(0, 2000)
  expect(requests, 'a page that opted out never loads giscus').toHaveLength(0)
})

/** Serves a tiny stand-in for the giscus client and records every request. */
async function stubGiscus(page: Page): Promise<string[]> {
  const requests: string[] = []
  await page.route('https://giscus.app/**', async (route) => {
    requests.push(route.request().url())
    await route.fulfill({
      body: GISCUS_STUB_SCRIPT,
      contentType: 'text/javascript',
    })
  })
  return requests
}
