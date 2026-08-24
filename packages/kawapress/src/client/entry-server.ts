import { createHead } from '@unhead/vue/server'
import { renderToString } from '@vue/server-renderer'
import consola from 'consola'
import { createKawapressApp } from './app'

export { pages } from 'virtual:kawapress-pages'
export { site } from 'virtual:kawapress-site'

export interface RenderResult {
  html: string
  found: boolean
  head: string
  htmlAttrs: string
}

export async function render(url: string): Promise<RenderResult> {
  const head = createHead()
  const { app, router } = await createKawapressApp({ head })

  app.config.errorHandler = (error) => {
    consola.error('KawaPress SSR error:', error)
  }

  await router.push(url)
  await router.isReady()
  const found = router.currentRoute.value.name !== 'not-found'
  const html = await renderToString(app)
  const { headTags, htmlAttrs } = await head.render()
  return { html, found, head: headTags, htmlAttrs }
}
