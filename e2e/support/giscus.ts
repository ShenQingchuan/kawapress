import type { Page } from '@playwright/test'

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

/** Serves a tiny stand-in for the giscus client and records every request. */
export async function stubGiscus(page: Page): Promise<string[]> {
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
