import type { InlineConfig } from 'vite'
import process from 'node:process'
import { consola } from 'consola'
import { createBuilder } from 'vite'
import { loadSiteConfig } from '../generator/load-config'
import { appChunkGroup } from '../generator/vite/app-chunk'
import {
  createBaseViteConfig,
  createSitePageLoader,
} from '../generator/vite/config'
import { entryClientPath, entryServerPath } from '../generator/vite/entries'
import { createPageInputs } from '../generator/vite/page-inputs'
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

export async function buildSite(root: string) {
  // Pinned before the site config loads, because loading it through Vite's
  // runnerImport() would otherwise leave NODE_ENV at "development" for the
  // client build. See ensureProductionNodeEnv().
  warnAboutReplacedNodeEnv(ensureProductionNodeEnv(process.env))
  const siteConfig = await loadSiteConfig(root)
  const pageLoader = createSitePageLoader(root, siteConfig)
  const pageInputs = await createPageInputs(pageLoader, siteConfig.publicDir)
  const viteConfig: InlineConfig = {
    ...createBaseViteConfig(root, siteConfig, { pageLoader }),
    mode: BUILD_MODE,
    environments: {
      client: {
        build: {
          outDir: 'dist',
          manifest: true,
          rolldownOptions: {
            // Every Markdown page is an input of its own, so each page becomes a
            // chunk with a content hash and no loader needs a dynamic `import()`
            // that Vite would answer with a preload dependency table.
            input: { 'entry-client': entryClientPath, ...pageInputs },
            // A page chunk keeps its own exports: the page table imports it and
            // reads the default component out of it.
            preserveEntrySignatures: 'allow-extension',
            output: {
              codeSplitting: {
                groups: [
                  // `$initial` would treat page-only code as app code as well,
                  // because page entries are initial entries too.
                  { name: appChunkGroup(entryClientPath), test: () => true },
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
