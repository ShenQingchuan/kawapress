import { createHead } from '@unhead/vue/client'
import { pageManifest } from 'virtual:kawapress-pages'
import { createKawapressApp } from '../app'

async function bootstrap(): Promise<void> {
  const head = createHead()
  const { app, router, adoptRequestedUrl } = await createKawapressApp({ head, pageManifest })
  await router.isReady()
  app.mount('#app')
  // The first render had to match the served HTML, which only describes the
  // path: the query, the hash and the not-found document are hydrated
  // afterwards, so the router moves to the URL the visitor opened right here.
  await adoptRequestedUrl()
}

bootstrap()
