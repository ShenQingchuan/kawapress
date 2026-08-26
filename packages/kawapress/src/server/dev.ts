import type { AddressInfo } from 'node:net'
import { createServer as createHttpServer } from 'node:http'
import { consola } from 'consola'
import { createReloadableDevEnvironment } from './dev-environment'

const DEFAULT_PORT = 5173

export interface CreateDevServerOptions {
  hmr?: boolean
  port?: number
}

export interface KawapressDevServer {
  close: () => Promise<void>
  port: number
}

export async function createDevServer(
  root: string,
  options: CreateDevServerOptions = {},
): Promise<KawapressDevServer> {
  const server = createHttpServer()
  const environment = await createReloadableDevEnvironment(root, server, {
    hmr: options.hmr,
  })
  server.on('request', environment.dispatchRequest)

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => reject(error)
    server.once('error', onError)
    server.listen(options.port ?? DEFAULT_PORT, () => {
      server.off('error', onError)
      resolve()
    })
  })

  const port = (server.address() as AddressInfo).port
  consola.ready(`KawaPress: dev server running at http://localhost:${port}`)

  return {
    port,
    async close() {
      await environment.close()
      await new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve())
      })
    },
  }
}
