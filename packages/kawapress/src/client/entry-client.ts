import { createHead } from '@unhead/vue/client'
import { createKawapressApp } from './app'

async function bootstrap() {
  const head = createHead()
  const { app, router } = await createKawapressApp({ head })
  await router.isReady()
  app.mount('#app')
}

bootstrap()
