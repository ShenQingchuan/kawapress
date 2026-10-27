import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

/**
 * The plugin fixture site declares no `themeConfig.sidebar`, so nagi builds the
 * sidebar from the pages on disk. Every title below comes from the frontmatter
 * of the page source, not from a hand-written list.
 *
 * The spec opens the page that turns the comment section off: the pages that
 * keep it would load giscus, which this suite never stubs outside its own spec.
 */
test('the automatic sidebar lists the pages of the site', async ({ page }) => {
  await page.goto(sitePath('/opt-out'))

  const links = page.locator('.nagi-sidebar--desktop .nagi-sidebar-item__link')
  await expect(links).toHaveText([
    'First page',
    'Page without comments',
    'Second page',
    'Styled page',
  ])
  await expect(links.nth(1)).toHaveAttribute('aria-current', 'page')
  await expect(links.nth(1)).toHaveAttribute('href', sitePath('/opt-out'))
})
