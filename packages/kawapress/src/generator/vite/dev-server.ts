import type { Server } from 'node:http'
import type {
  InlineConfig,
  RunnableDevEnvironment,
  ViteDevServer,
} from 'vite'
import type { ResolvedSiteConfig } from '../config'
import { createServer, isRunnableDevEnvironment } from 'vite'
import { createBaseViteConfig } from './config'
import { entryServerPath } from './entries'

export interface KawapressViteServer {
  vite: ViteDevServer
  serverEnv: RunnableDevEnvironment
}

export interface CreateViteServerOptions {
  hmr?: boolean
  httpServer?: Server
}

export async function createViteServer(
  root: string,
  siteConfig: ResolvedSiteConfig,
  options: CreateViteServerOptions = {},
): Promise<KawapressViteServer> {
  const viteConfig: InlineConfig = {
    ...createBaseViteConfig(root, siteConfig),
    environments: {
      ssr: {
        consumer: 'server',
        build: {
          rollupOptions: { input: entryServerPath },
        },
      },
    },
    server: {
      hmr: options.hmr,
      middlewareMode: options.httpServer
        ? { server: options.httpServer }
        : true,
    },
  }
  await siteConfig.pluginRunner.runVite(viteConfig)

  const vite = await createServer(viteConfig)
  const serverEnv = vite.environments.ssr
  if (!isRunnableDevEnvironment(serverEnv)) {
    throw new Error('KawaPress: server environment is not runnable')
  }

  return { vite, serverEnv }
}
