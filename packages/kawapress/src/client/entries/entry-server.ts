import type { OutletRegistry } from '../../core/outlet'
import { createHead } from '@unhead/vue/server'
import { renderToString } from '@vue/server-renderer'
import consola from 'consola'
import { createKawapressApp } from '../app'
import { getRenderedOutlets } from '../outlet'

export { pages } from 'virtual:kawapress-pages'
export { site } from 'virtual:kawapress-site'

export interface RenderResult {
  html: string
  found: boolean
  head: string
  htmlAttrs: string
  /** Outlets the rendered page actually mounted. */
  outlets: string[]
}

// The registry only depends on runtime plugin setup, so any render returns the
// same one. Prerendering renders pages one after another and reads it afterwards.
let latestOutletRegistry: OutletRegistry | undefined

export function getOutletRegistry(): OutletRegistry {
  if (!latestOutletRegistry) {
    throw new Error(
      'KawaPress: the outlet registry is not ready. Render at least one page with render() first.',
    )
  }
  return latestOutletRegistry
}

export async function render(url: string): Promise<RenderResult> {
  const head = createHead()
  const { app, router, outlets } = await createKawapressApp({ head })
  latestOutletRegistry = outlets

  app.config.errorHandler = (error) => {
    consola.error('KawaPress SSR error:', error)
  }

  await router.push(url)
  await router.isReady()
  const found = router.currentRoute.value.name !== 'not-found'
  const ssrContext: Record<string, unknown> = {}
  const html = await renderToString(app, ssrContext)
  const { headTags, htmlAttrs } = await head.render()
  return {
    html,
    found,
    head: headTags,
    htmlAttrs,
    outlets: getRenderedOutlets(ssrContext),
  }
}
