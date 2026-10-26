import type { InlineConfig } from 'vite'
import { consola } from 'consola'
import { createBuilder } from 'vite'
import { loadSiteConfig } from '../generator/load-config'
import {
  createBaseViteConfig,
  createSitePageLoader,
} from '../generator/vite/config'
import { entryClientPath, entryServerPath } from '../generator/vite/entries'
import {
  createBuildArtifactEmitter,
  createBuildArtifactImporter,
} from './build-artifacts'
import { checkDeadLinks } from './check-dead-links'
import { prerenderPages } from './prerender'

export async function buildSite(root: string) {
  const siteConfig = await loadSiteConfig(root)
  const pageLoader = createSitePageLoader(root, siteConfig)
  const viteConfig: InlineConfig = {
    ...createBaseViteConfig(root, siteConfig, { pageLoader }),
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
  await checkDeadLinks({ root, siteConfig, pageLoader })
  await siteConfig.pluginRunner.runBuildArtifacts({
    emitFile: createBuildArtifactEmitter(root),
    importModule: createBuildArtifactImporter(root),
  })
  await prerenderPages(root)

  consola.success('KawaPress: build complete')
}
