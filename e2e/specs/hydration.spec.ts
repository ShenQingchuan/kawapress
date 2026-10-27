import type { Page } from '@playwright/test'
import { expect, test } from '../support/fixtures'
import { previewOrigin, sitePath } from '../support/site'

const routing = '/guide/routing'
const englishRouting = '/en/guide/routing'
const anchor = 'linking-between-pages'
const requestedPath = `${sitePath(routing)}?from=test#${anchor}`

/**
 * The doc layout scrolls an inner container, so this is the element a hash jump
 * moves and the one the assertions read.
 */
const docScrollViewport = '.nagi-main--doc .nagi-os-scroll__viewport'

interface ScrollSpyWindow extends Window {
  __kawapressScrollTargets?: string[]
}

/**
 * Records which elements the client called `scrollIntoView` on, so a test can
 * tell one anchor jump from several.
 */
async function recordScrollTargets(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const targets: string[] = []
    ;(window as ScrollSpyWindow).__kawapressScrollTargets = targets
    const scrollIntoView = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (this: Element, options?: boolean | ScrollIntoViewOptions) {
      targets.push(this.id)
      return scrollIntoView.call(this, options)
    }
  })
}

async function scrollTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as ScrollSpyWindow).__kawapressScrollTargets ?? [])
}

/**
 * A static host ignores the query and no browser sends the hash, so the served
 * HTML of `/guide/routing?from=test#linking-between-pages` is the document of
 * `/guide/routing`. The client hydrates that path and only then adopts the whole
 * URL: the address bar never changes, nothing is added to the history and the
 * language links end up pointing at the URL the visitor actually opened.
 */
test('a page opened with a query and a hash hydrates at its path', async ({ page }) => {
  await recordScrollTargets(page)
  await page.goto(requestedPath)

  // The console guard of the fixtures fails this test on a hydration warning,
  // which is what a client starting on the full URL would produce.
  await expect(page.locator('article h1')).toContainText('路由')
  await expect(page).toHaveURL(`${previewOrigin}${requestedPath}`)

  await expect(
    page.locator('.nagi-language-menu__link[lang="en"]'),
    'the language link has to follow the adopted URL, query and hash included',
  ).toHaveAttribute('href', `${sitePath(englishRouting)}?from=test#${anchor}`)

  const landing = await page.evaluate(({ anchor, selector }) => {
    const heading = document.querySelector(`#${anchor}`)!
    const viewport = document.querySelector(selector)!
    return {
      offset: heading.getBoundingClientRect().top - viewport.getBoundingClientRect().top,
      scrollTop: viewport.scrollTop,
    }
  }, { anchor, selector: docScrollViewport })
  expect(landing.scrollTop, 'the doc area has to scroll to the anchor').toBeGreaterThan(0)
  // `scroll-margin-top` keeps the heading a little below the top edge.
  expect(landing.offset).toBeGreaterThanOrEqual(0)
  expect(landing.offset).toBeLessThan(80)

  await expect(
    page.locator('.nagi-outline-item__link[aria-current="location"]'),
  ).toHaveAttribute('href', `#${anchor}`)

  // The sidebar highlights the current page from its path alone, so it has to
  // keep matching once the query and the hash are part of the URL.
  const active = page.locator('.nagi-sidebar--desktop .nagi-sidebar-item__link.is-active')
  await expect(active).toHaveCount(1)
  await expect(active).toHaveAttribute('href', sitePath(routing))
  await expect(active).toHaveAttribute('aria-current', 'page')

  // Adopting the URL must not scroll a second time and fight a reader who
  // already scrolled away. Two frames are enough: the adoption happened before
  // the language link above matched, and a scroll would have run with it.
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
  expect(
    (await scrollTargets(page)).filter(target => target === anchor),
    'the anchor is scrolled into view exactly once',
  ).toHaveLength(1)
})

test('adopting the requested URL adds no history entry', async ({ page, context }) => {
  const plainPage = await context.newPage()
  await plainPage.goto(sitePath(routing))
  await expect(plainPage.locator('article h1')).toContainText('路由')
  const plainLength = await plainPage.evaluate(() => window.history.length)
  await plainPage.close()

  await page.goto(requestedPath)
  await expect(page.locator('article h1')).toContainText('路由')
  await expect(
    page.locator('.nagi-language-menu__link[lang="en"]'),
    'wait for the adoption before reading the history',
  ).toHaveAttribute('href', `${sitePath(englishRouting)}?from=test#${anchor}`)

  expect(await page.evaluate(() => window.history.length)).toBe(plainLength)
})
