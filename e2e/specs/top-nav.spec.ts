import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

test('the top bar switches between the guide and the plugins', async ({ page }) => {
  await page.goto(sitePath('/guide/routing'))

  const nav = page.getByRole('navigation', { name: '主导航' })
  const guide = nav.getByRole('link', { name: '指南' })
  const plugins = nav.getByRole('link', { name: '插件' })
  await expect(guide).toHaveAttribute('aria-current', 'page')
  await expect(plugins).not.toHaveAttribute('aria-current', 'page')

  await expect(page.locator('.nagi-sidebar--desktop')).toContainText('路由')
  await expect(page.locator('.nagi-sidebar--desktop')).not.toContainText('Mermaid 图表')

  await plugins.click()
  await expect(page).toHaveURL(new RegExp(`${sitePath('/plugins/plugin-system')}$`))
  await expect(plugins).toHaveAttribute('aria-current', 'page')
  await expect(guide).not.toHaveAttribute('aria-current', 'page')
  await expect(page.locator('.nagi-sidebar--desktop')).toContainText('Mermaid 图表')
  await expect(page.locator('.nagi-sidebar--desktop')).not.toContainText('路由')
})

test('a plugin page keeps the plugin section highlighted', async ({ page }) => {
  await page.goto(sitePath('/plugins/mermaid'))
  await expect(
    page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '插件' }),
  ).toHaveAttribute('aria-current', 'page')
})

test('the English bar links to the English sections', async ({ page }) => {
  await page.goto(sitePath('/en/guide/routing'))
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  await expect(nav.getByRole('link', { name: 'Guide' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Plugins' }))
    .toHaveAttribute('href', sitePath('/en/plugins/plugin-system'))
})

test('on a narrow screen the links move into the menu', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 800 })
  await page.goto(sitePath('/guide/routing'))

  await expect(page.locator('.nagi-nav__links')).toBeHidden()
  await page.getByRole('button', { name: '打开导航菜单' }).click()
  await expect(page.locator('#nagi-nav-screen').getByRole('link', { name: '插件' })).toBeVisible()
})
