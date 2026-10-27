import { expect, test } from '../support/fixtures'
import { sitePath } from '../support/site'

const mermaidPage = '/plugins/mermaid'

test('the diagram is already in the server HTML', async ({ request }) => {
  const response = await request.get(sitePath(mermaidPage))
  const html = await response.text()

  expect(html).toContain('kawa-mermaid')
  expect(html).toMatch(/<svg[^>]*class="pele pele-flowchart"/)
})

test('the three views switch between diagram, code and side by side', async ({ page }) => {
  await page.goto(sitePath(mermaidPage))

  const block = page.locator('.kawa-mermaid').first()
  const stage = block.locator('.kawa-mermaid__stage')
  const code = block.locator('.kawa-mermaid__code')

  await expect(block).toHaveAttribute('data-view', 'diagram')
  await expect(stage).toBeVisible()
  await expect(code).toBeHidden()

  await block.getByRole('button', { name: '代码', exact: true }).click()
  await expect(block).toHaveAttribute('data-view', 'code')
  await expect(stage).toBeHidden()
  await expect(code).toBeVisible()
  await expect(code).toContainText('flowchart LR')

  await block.getByRole('button', { name: '并排', exact: true }).click()
  await expect(block).toHaveAttribute('data-view', 'split')
  await expect(stage).toBeVisible()
  await expect(code).toBeVisible()

  const stageBox = await stage.boundingBox()
  const codeBox = await code.boundingBox()
  // The source is on the left and the diagram on the right.
  expect(codeBox!.x).toBeLessThan(stageBox!.x)
  expect(Math.abs(stageBox!.y - codeBox!.y)).toBeLessThan(2)

  await expect(block.getByRole('button', { name: '并排', exact: true }))
    .toHaveAttribute('aria-pressed', 'true')
})

test('the browser takes the diagram over and offers zoom buttons', async ({ page }) => {
  await page.goto(sitePath(mermaidPage))

  const stage = page.locator('.kawa-mermaid__stage').first()
  await expect(stage).toHaveClass(/is-enhanced/)
  await expect(stage.locator('.kawa-mermaid__host svg.pele')).toBeVisible()
  await expect(stage.getByRole('button', { name: '放大' })).toBeVisible()
  await expect(stage.getByRole('button', { name: '缩小' })).toBeVisible()

  // Reset only makes sense once the diagram is zoomed.
  const reset = stage.getByRole('button', { name: '重置缩放' })
  await expect(reset).toBeHidden()
  await stage.getByRole('button', { name: '放大' }).click()
  await expect(reset).toBeVisible()
  await reset.click()
  await expect(reset).toBeHidden()
})

test('a fence can pick the starting view', async ({ page }) => {
  await page.goto(sitePath('/plugins/mermaid'))
  await expect(page.locator('.kawa-mermaid[data-view="split"]')).toHaveCount(1)
})

test('the English page uses English view names', async ({ page }) => {
  await page.goto(sitePath(`/en${mermaidPage}`))

  const block = page.locator('.kawa-mermaid').first()
  await expect(block.getByRole('button', { name: 'Side by side' })).toBeVisible()
  await expect(block.getByRole('button', { name: 'Code', exact: true })).toBeVisible()
})
