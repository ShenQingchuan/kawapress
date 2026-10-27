import { expect, test } from '../support/fixtures'
import { devOrigin, sitePath } from '../support/site'

interface MarkerWindow extends Window {
  __kawapressE2eMarker?: string
}

test('the dev server renders the home page', async ({ page }) => {
  const response = await page.goto(sitePath('/'))
  expect(response?.status()).toBe(200)
  await expect(page.locator('#app h1').first()).toBeVisible()
})

test('the dev server renders a guide page', async ({ page }) => {
  const response = await page.goto(sitePath('/guide/getting-started'))
  expect(response?.status()).toBe(200)
  await expect(page.locator('article h1')).toContainText('快速开始')
})

test('sidebar links navigate on the client in dev', async ({ page }) => {
  await page.goto(sitePath('/guide/getting-started'))
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => {
    (window as MarkerWindow).__kawapressE2eMarker = 'kept'
  })

  await page
    .locator('.nagi-sidebar--desktop')
    .getByRole('link', { name: '路由', exact: true })
    .click()

  await expect(page.locator('article h1')).toContainText('路由')
  expect(
    await page.evaluate(() => (window as MarkerWindow).__kawapressE2eMarker),
  ).toBe('kept')
})

/**
 * Dev renders every request by path only as well, so a URL with a query and a
 * hash has to hydrate the same way the built site does.
 */
test('the dev server hydrates a page opened with a query and a hash', async ({ page }) => {
  const requestedPath = `${sitePath('/guide/routing')}?from=test#linking-between-pages`
  await page.goto(requestedPath)

  await expect(page.locator('article h1')).toContainText('路由')
  await expect(page).toHaveURL(`${devOrigin}${requestedPath}`)
  await expect(
    page.locator('.nagi-language-menu__link[lang="en"]'),
    'the dev server has to adopt the requested URL as well',
  ).toHaveAttribute('href', `${sitePath('/en/guide/routing')}?from=test#linking-between-pages`)
})

/**
 * A cold optimizer cache is the normal first visit, and the dev server starts
 * with one (see the webServer command). Every package the page eventually needs
 * has to be pre-bundled before the page asks for it: when Vite only discovers a
 * package while the page loads, it swaps its optimizer output and reloads the
 * whole document, which loses in-page state and can land in the middle of any
 * interaction.
 */
test('the dev server loads each page once on a cold dependency cache', async ({ page }) => {
  const documentLoads: string[] = []
  page.on('load', () => documentLoads.push(page.url()))

  // A theme page: the scrollbar runtime is imported after hydration.
  const gettingStarted = sitePath('/guide/getting-started')
  await page.goto(gettingStarted)
  await expect(page.locator('article h1')).toContainText('快速开始')

  // A page with Twoslash blocks: the popup runtime is imported by that page only.
  const markdownExtensions = sitePath('/guide/markdown-extensions')
  await page.goto(markdownExtensions)
  await expect(page.locator('article h1')).toContainText('Markdown 语法扩展')

  // The optimizer batches discoveries for a moment, so a reload that it causes
  // arrives after the render above.
  await page.waitForTimeout(3_000)

  expect(
    documentLoads,
    'the dev server must not reload a page to optimize a dependency',
  ).toEqual([
    `${devOrigin}${gettingStarted}`,
    `${devOrigin}${markdownExtensions}`,
  ])
})
