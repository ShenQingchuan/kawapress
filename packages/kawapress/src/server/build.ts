import type { InlineConfig } from 'vite'
import process from 'node:process'
import { consola } from 'consola'
import { createBuilder } from 'vite'
import { loadSiteConfig } from '../generator/load-config'
import {
  createBaseViteConfig,
  createSitePageLoader,
} from '../generator/vite/config'
import { entryClientPath, entryServerPath } from '../generator/vite/entries'
import {
  PAGE_MANIFEST_CHUNK_NAME,
  PAGE_MANIFEST_MODULE_ID,
} from '../generator/vite/plugins/pages'
import {
  createBuildArtifactEmitter,
  createBuildArtifactImporter,
} from './build-artifacts'
import {
  ensureProductionNodeEnv,
  warnAboutReplacedNodeEnv,
} from './build-node-env'
import { checkDeadLinks } from './check-dead-links'
import { prerenderPages } from './prerender'

/** Vite mode of a build; the mode drives `import.meta.env` and which `.env.*` files load. */
const BUILD_MODE = 'production'

/**
 * Chunk of the app itself: the runtime, the router, the theme and every other
 * module except the page manifest and the entry. It is keyed by framework code,
 * so editing page content must leave its hash alone.
 */
const APP_CHUNK_NAME = 'app'

export async function buildSite(root: string) {
  // Pinned before the site config loads, because loading it through Vite's
  // runnerImport() would otherwise leave NODE_ENV at "development" for the
  // client build. See ensureProductionNodeEnv().
  warnAboutReplacedNodeEnv(ensureProductionNodeEnv(process.env))
  const siteConfig = await loadSiteConfig(root)
  const pageLoader = createSitePageLoader(root, siteConfig)
  const viteConfig: InlineConfig = {
    ...createBaseViteConfig(root, siteConfig, { pageLoader }),
    mode: BUILD_MODE,
    environments: {
      client: {
        build: {
          outDir: 'dist',
          manifest: true,
          rolldownOptions: {
            input: entryClientPath,
            // Page content changes far more often than framework and theme code.
            // The manifest gets a chunk of its own, and the entry keeps only the
            // bootstrap, so a content edit invalidates neither the app chunk nor
            // the chunks that refer to it.
            output: {
              codeSplitting: {
                groups: [
                  {
                    name: PAGE_MANIFEST_CHUNK_NAME,
                    test: (id: string) => id.includes(PAGE_MANIFEST_MODULE_ID),
                    // The manifest is pure data: taking its dependencies along
                    // would pull the preload helper out of the app chunk.
                    includeDependenciesRecursively: false,
                  },
                  {
                    name: APP_CHUNK_NAME,
                    tags: ['$initial'],
                    test: (id: string) => id !== entryClientPath,
                  },
                ],
              },
            },
          },
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

  // Plugin `vite` hooks mutate the config above, so the build states its mode again
  // rather than trusting whatever they left in it.
  const builder = await createBuilder({ ...viteConfig, mode: BUILD_MODE })
  await builder.buildApp()
  await checkDeadLinks({ root, siteConfig, pageLoader })
  await siteConfig.pluginRunner.runBuildArtifacts({
    emitFile: createBuildArtifactEmitter(root),
    importModule: createBuildArtifactImporter(root),
  })
  await prerenderPages(root)

  consola.success('KawaPress: build complete')
}
