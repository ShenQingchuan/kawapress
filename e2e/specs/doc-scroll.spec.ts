import { expect, test } from '../support/fixtures'
import { previewOrigin, sitePath } from '../support/site'

const routing = '/guide/routing'
const gettingStarted = '/guide/getting-started'

/**
 * The doc layout is a fixed shell: only the doc scroll area scrolls, and it is a
 * plain `overflow: auto` container until the OverlayScrollbars runtime has been
 * loaded after hydration. Both states have to scroll the same element, so the
 * outline scroll spy, the hash landing and the return-to-top button keep working
 * no matter when the runtime arrives.
 */
const docScrollArea = '.nagi-main--doc .nagi-main__scroll'
const docViewport = `${docScrollArea} .nagi-os-scroll__viewport`

test('the first paint scrolls with the themed native scrollbar', async ({ page }) => {
  // An empty client entry leaves the prerendered HTML alone: this is exactly
  // what a visitor sees before the client bundle has run.
  await page.route(/\/assets\/entry-client-[^/]+\.js$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: '',
  }))
  await page.goto(sitePath(routing), { waitUntil: 'domcontentloaded' })

  const area = page.locator(docScrollArea)
  await expect(area).toBeVisible()
  expect(
    await area.getAttribute('data-overlayscrollbars'),
    'the scroll area must not depend on the runtime for its first paint',
  ).toBeNull()

  const painted = await page.locator(docViewport).evaluate((element) => {
    const styles = window.getComputedStyle(element)
    element.scrollTop = 300
    return {
      overflowY: styles.overflowY,
      scrollbarWidth: styles.scrollbarWidth,
      scrollbarColor: styles.scrollbarColor,
      scrollTop: element.scrollTop,
      overflowAmount: element.scrollHeight - element.clientHeight,
      bodyScrolls: document.body.scrollHeight > document.body.clientHeight,
    }
  })

  expect(painted.overflowY).toBe('auto')
  // The native scrollbar uses the same thin, themed thumb as every other
  // nested scroll area of the theme.
  expect(painted.scrollbarWidth).toBe('thin')
  expect(painted.scrollbarColor).not.toBe('auto')
  expect(painted.overflowAmount).toBeGreaterThan(0)
  expect(painted.scrollTop).toBe(300)
  expect(painted.bodyScrolls, 'the page shell itself must not scroll').toBe(false)
})

test('the doc scroll area gets overlay scrollbars after hydration', async ({ page }) => {
  await page.goto(sitePath(routing))

  const area = page.locator(docScrollArea)
  await expect(area).toHaveAttribute('data-overlayscrollbars', 'host')
  await expect(area.locator('.os-scrollbar-vertical')).toHaveClass(/os-theme-nagi/)

  const handle = await area.locator('.os-scrollbar-vertical .os-scrollbar-handle').evaluate((element) => {
    const track = window.getComputedStyle(element.parentElement!)
    const styles = window.getComputedStyle(element)
    return {
      trackWidth: track.width,
      borderRadius: styles.borderRadius,
      background: styles.backgroundColor,
    }
  })
  expect(handle.trackWidth).toBe('6px')
  expect(handle.borderRadius).toContain('9999px')
  expect(handle.background).not.toBe('rgba(0, 0, 0, 0)')
})

test('the outline follows the enhanced doc scroll area', async ({ page }) => {
  await page.goto(sitePath(routing))

  const viewport = page.locator(docViewport)
  const outlineLinks = page.locator('.nagi-outline .nagi-outline-item__link')
  const activeLinks = page.locator('.nagi-outline .nagi-outline-item__link[aria-current="location"]')
  const firstHeading = (await outlineLinks.first().textContent())!.trim()
  await expect(activeLinks).toHaveCount(1)
  await expect(activeLinks).toHaveText(firstHeading)

  const lastHeading = (await outlineLinks.last().textContent())!.trim()
  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })

  // The last heading of the page is the one at the bottom of the scroll area.
  await expect(activeLinks).toHaveCount(1)
  await expect(activeLinks).toHaveText(lastHeading)

  // A sidebar link from the shell navigates the router and puts the new page
  // back at the top of the same scroll area.
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.nagi-main--doc .nagi-os-scroll__viewport')!.scrollTop = 1500
  })
  await page
    .locator('.nagi-sidebar--desktop')
    .getByRole('link', { name: '快速开始', exact: true })
    .click()

  await expect(page).toHaveURL(`${previewOrigin}${sitePath(gettingStarted)}`)
  await expect(page.locator('article h1')).toContainText('快速开始')
  await expect(viewport).toHaveJSProperty('scrollTop', 0)
  // The area keeps the enhanced node across the navigation.
  await expect(page.locator(docScrollArea)).toHaveAttribute('data-overlayscrollbars', 'host')
})
