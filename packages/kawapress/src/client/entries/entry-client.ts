import { createHead } from '@unhead/vue/client'
import { createKawapressApp } from '../app'

async function bootstrap(): Promise<void> {
  const head = createHead()
  const { app, router, adoptRequestedUrl } = await createKawapressApp({ head })
  await router.isReady()
  app.mount('#app')
  // The first render had to match the served HTML, which for the prerendered
  // not-found document means the route the server used. Only once the DOM is
  // hydrated may the router move to the URL the visitor actually opened.
  await adoptRequestedUrl()
}

bootstrap()
