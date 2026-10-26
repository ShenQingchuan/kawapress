import { expect, test } from '../support/fixtures'
import { discoverRoutes } from '../support/routes'
import { sitePath } from '../support/site'

// The route list comes from the built output, so newly added pages are covered
// without touching this spec.
for (const route of discoverRoutes()) {
  test(`prerenders ${route}`, async ({ page }) => {
    const response = await page.goto(sitePath(route))
    expect(
      response?.status(),
      `${sitePath(route)} should be served from the build output`,
    ).toBe(200)
    // The HTML is prerendered, so the heading is part of the response and not
    // something the client has to produce.
    await expect(page.locator('#app h1').first()).toBeVisible()
  })
}
