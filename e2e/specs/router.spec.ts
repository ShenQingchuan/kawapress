import type { Page } from '@playwright/test'
import { expect, test } from '../support/fixtures'
import { pluginsOrigin, previewOrigin, sitePath } from '../support/site'

const gettingStarted = '/guide/getting-started'
const routing = '/guide/routing'

interface MarkerWindow extends Window {
  __kawapressE2eMarker?: string
  __styledProbeColor?: string
}

/**
 * Anything stored on `window` is lost as soon as the browser loads a new
 * document, so it proves that a navigation stayed inside the app.
 */
async function markWindow(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as MarkerWindow).__kawapressE2eMarker = 'kept'
  })
}

async function readMarker(page: Page): Promise<string | undefined> {
  return page.evaluate(() => (window as MarkerWindow).__kawapressE2eMarker)
}

/** How often the browser requested the chunk of one page. */
async function pageChunkRequests(page: Page, route: string): Promise<number> {
  return page.evaluate(marker => performance
    .getEntriesByType('resource')
    .filter(entry => entry.name.includes(marker) && entry.name.endsWith('.js'))
    .length, `/pages${route}-`)
}

test('back and forward restore the pages they left', async ({ page }) => {
  await page.goto(sitePath(gettingStarted))
  await expect(page.locator('article h1')).toContainText('快速开始')
  await markWindow(page)

  await page
    .locator('.nagi-sidebar--desktop')
    .getByRole('link', { name: '路由', exact: true })
    .click()
  await expect(page.locator('article h1')).toContainText('路由')

  await page.goBack()
  await expect(page).toHaveURL(`${previewOrigin}${sitePath(gettingStarted)}`)
  await expect(page.locator('article h1')).toContainText('快速开始')
  expect(await readMarker(page), 'going back must not reload the document').toBe('kept')

  await page.goForward()
  await expect(page).toHaveURL(`${previewOrigin}${sitePath(routing)}`)
  await expect(page.locator('article h1')).toContainText('路由')
  expect(await readMarker(page), 'going forward must not reload the document').toBe('kept')
})

test('two clicks in quick succession end on the second page', async ({ page }) => {
  await page.goto(sitePath(gettingStarted))
  await expect(page.locator('article h1')).toContainText('快速开始')
  await markWindow(page)

  // Both clicks happen in the same task, so the first page is still loading
  // when the second navigation starts. The later click has to win.
  await page.evaluate((hrefs) => {
    for (const href of hrefs) {
      const anchor = document.createElement('a')
      anchor.href = href
      anchor.textContent = href
      document.body.append(anchor)
      anchor.click()
    }
  }, [sitePath(routing), sitePath(gettingStarted)])

  await expect(page).toHaveURL(`${previewOrigin}${sitePath(gettingStarted)}`)
  await expect(page.locator('article h1')).toContainText('快速开始')
  expect(await readMarker(page)).toBe('kept')
})

test('a hash-only navigation on the same page loads no page chunk again', async ({ page }) => {
  await page.goto(sitePath(routing))
  await expect(page.locator('article h1')).toContainText('路由')
  await markWindow(page)
  expect(await pageChunkRequests(page, routing)).toBe(1)

  await page
    .locator('.nagi-outline-item__link')
    .nth(1)
    .click()

  await expect(page).toHaveURL(/#.+/)
  expect(
    await pageChunkRequests(page, routing),
    'an anchor on the current page must not load its page module again',
  ).toBe(1)
  expect(await readMarker(page)).toBe('kept')
})

test('a percent-encoded page path is replaced by the decoded one', async ({ page }) => {
  // `%65` is `e`: the server answers this URL with the document of
  // `/guide/routing`, and the client corrects the address bar to it.
  await page.goto(sitePath('/guid%65/routing'))

  await expect(page.locator('article h1')).toContainText('路由')
  await expect(page).toHaveURL(`${previewOrigin}${sitePath(routing)}`)
})

test('a page with its own styles is styled before its content shows', async ({ page }) => {
  // Records the computed colour the first time the styled element exists, so a
  // stylesheet that arrives after the content would be caught.
  await page.addInitScript(() => {
    const record = () => {
      const element = document.querySelector('.styled-probe')
      if (element && !(window as MarkerWindow).__styledProbeColor) {
        ;(window as MarkerWindow).__styledProbeColor = getComputedStyle(element).color
      }
    }
    new MutationObserver(record).observe(document, {
      childList: true,
      subtree: true,
    })
  })

  await page.goto(`${pluginsOrigin}${sitePath('/second')}`)
  await page.getByRole('link', { name: 'Open the styled page' }).click()

  await expect(page).toHaveURL(`${pluginsOrigin}${sitePath('/styled')}`)
  await expect(page.locator('.styled-probe')).toBeVisible()
  expect(
    await page.evaluate(() => (window as MarkerWindow).__styledProbeColor),
    'the page stylesheet has to be applied before the page content appears',
  ).toBe('rgb(1, 2, 3)')
})

test('a Twoslash popup works after a client navigation', async ({ page }) => {
  await page.goto(sitePath(gettingStarted))
  await expect(page.locator('article h1')).toContainText('快速开始')

  await page
    .locator('.nagi-sidebar--desktop')
    .getByRole('link', { name: 'Markdown 语法扩展', exact: true })
    .click()
  await expect(page.locator('article h1')).toContainText('Markdown 语法扩展')
  await page.waitForLoadState('networkidle')

  await page.locator('pre.twoslash .v-popper.twoslash-hover').first().hover()

  await expect(
    page.locator('.v-popper__popper').filter({ hasText: '(value: number) => string' }),
  ).toBeVisible()
})
