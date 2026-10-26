import { expect, test } from '../support/fixtures'
import { previewOrigin, sitePath } from '../support/site'

interface MarkerWindow extends Window {
  __kawapressE2eMarker?: string
}

const gettingStarted = '/guide/getting-started'

test('a sidebar link navigates without a full page reload', async ({ page }) => {
  await page.goto(sitePath(gettingStarted))
  await expect(page.locator('article h1')).toContainText('快速开始')

  // Anything stored on `window` is lost as soon as the browser loads a new
  // document, so it proves the router handled the click.
  await page.evaluate(() => {
    (window as MarkerWindow).__kawapressE2eMarker = 'kept'
  })

  await page
    .locator('.nagi-sidebar--desktop')
    .getByRole('link', { name: '路由', exact: true })
    .click()

  await expect(page).toHaveURL(`${previewOrigin}${sitePath('/guide/routing')}`)
  await expect(page.locator('article h1')).toContainText('路由')
  expect(
    await page.evaluate(() => (window as MarkerWindow).__kawapressE2eMarker),
  ).toBe('kept')
})

test('previous and next links follow the sidebar order', async ({ page }) => {
  await page.goto(sitePath(gettingStarted))

  const previous = page.locator('.nagi-doc-navigation__link--previous')
  const next = page.locator('.nagi-doc-navigation__link--next')
  await expect(previous).toHaveAttribute(
    'href',
    sitePath('/guide/what-is-kawapress'),
  )
  await expect(next).toHaveAttribute(
    'href',
    sitePath('/guide/ai-ready-documentation'),
  )

  await next.click()
  await expect(page).toHaveURL(
    `${previewOrigin}${sitePath('/guide/ai-ready-documentation')}`,
  )
  await expect(page.locator('article h1')).toContainText('面向 AI 的文档')

  await page.locator('.nagi-doc-navigation__link--previous').click()
  await expect(page).toHaveURL(`${previewOrigin}${sitePath(gettingStarted)}`)
})

test('switching the language keeps the same page', async ({ page }) => {
  await page.goto(sitePath(gettingStarted))
  await expect(page.locator('article h1')).toContainText('快速开始')

  await page
    .locator('.nagi-nav__controls--desktop')
    .getByRole('button', { name: '切换语言' })
    .click()
  await page
    .locator('.nagi-language-menu')
    .getByRole('link', { name: 'English' })
    .click()

  await expect(page).toHaveURL(
    `${previewOrigin}${sitePath('/en/guide/getting-started')}`,
  )
  await expect(page.locator('article h1')).toContainText('Getting Started')
})
