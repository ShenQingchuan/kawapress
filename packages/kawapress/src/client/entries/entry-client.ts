import { createHead } from '@unhead/vue/client'
import { pages } from 'virtual:kawapress-pages'
import { createKawapressApp } from '../app'

async function bootstrap(): Promise<void> {
  const head = createHead()
  const { app, start, adoptRequestedUrl } = await createKawapressApp({ head, pages })
  // The first render has to match the served HTML, which only describes a path.
  await start()
  app.mount('#app')
  // The query, the hash, the not-found document and encoded paths are adopted
  // afterwards: no page load, no history entry.
  await adoptRequestedUrl()
}

bootstrap()
