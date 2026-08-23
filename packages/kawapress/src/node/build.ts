import type { InlineConfig } from 'vite'
import { consola } from 'consola'
import { createBuilder } from 'vite'
import { entryClientPath, entryServerPath } from './entries'
import { loadSiteConfig } from './load-config'
import { prerenderPages } from './prerender'
import { createBaseViteConfig } from './vite-config'

export async function buildSite(root: string) {
  const siteConfig = await loadSiteConfig(root)
  const viteConfig: InlineConfig = {
    ...createBaseViteConfig(root, siteConfig),
    environments: {
      client: {
        build: {
          outDir: 'dist',
          manifest: true,
          rollupOptions: { input: entryClientPath },
        },
      },
      ssr: {
        consumer: 'server',
        build: {
          outDir: 'dist/.server',
          rollupOptions: { input: entryServerPath },
        },
      },
    },
  }
  await siteConfig.pluginRunner.runVite(viteConfig)

  const builder = await createBuilder(viteConfig)
  await builder.buildApp()
  await prerenderPages(root)

  consola.success('KawaPress: build complete')
}
