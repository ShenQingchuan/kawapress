import type {
  IncomingMessage,
  Server,
  ServerResponse,
} from 'node:http'
import type { KawapressViteServer } from './vite'
import { watch } from 'node:fs'
import { consola } from 'consola'
import { CONFIG_FILE_NAME, loadSiteConfig } from './load-config'
import { createRequestHandler } from './request-handler'
import { createViteServer } from './vite'

const RESTART_DELAY = 50

export interface ReloadableDevEnvironment {
  close: () => Promise<void>
  dispatchRequest: (req: IncomingMessage, res: ServerResponse) => void
}

export interface ReloadableDevEnvironmentOptions {
  hmr?: boolean
}

interface ActiveEnvironment extends KawapressViteServer {
  handleRequest: ReturnType<typeof createRequestHandler>
}

export async function createReloadableDevEnvironment(
  root: string,
  httpServer: Server,
  options: ReloadableDevEnvironmentOptions = {},
): Promise<ReloadableDevEnvironment> {
  let active: ActiveEnvironment | undefined
  let restartError: unknown
  let restartTimer: ReturnType<typeof setTimeout> | undefined
  let restartQueue = Promise.resolve()
  let closed = false

  const createEnvironment = async (): Promise<ActiveEnvironment> => {
    const siteConfig = await loadSiteConfig(root)
    const environment = await createViteServer(root, siteConfig, {
      hmr: options.hmr,
      httpServer,
    })
    return {
      ...environment,
      handleRequest: createRequestHandler(
        environment.vite,
        environment.serverEnv,
      ),
    }
  }

  const restart = async (): Promise<void> => {
    const previous = active
    active = undefined
    restartError = undefined
    await previous?.vite.close()

    try {
      active = await createEnvironment()
      consola.success('KawaPress: configuration reloaded')
    }
    catch (error) {
      restartError = error
      consola.error('KawaPress: failed to reload configuration', error)
    }
  }

  const scheduleRestart = (): void => {
    if (closed) {
      return
    }
    clearTimeout(restartTimer)
    restartTimer = setTimeout(() => {
      restartQueue = restartQueue.then(restart)
    }, RESTART_DELAY)
  }

  active = await createEnvironment()

  const configWatcher = watch(root, (_event, fileName) => {
    if (fileName?.toString() === CONFIG_FILE_NAME) {
      scheduleRestart()
    }
  })

  return {
    dispatchRequest(req, res) {
      const current = active
      if (!current) {
        res.statusCode = 503
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(restartError instanceof Error
          ? restartError.stack
          : 'KawaPress is restarting')
        return
      }

      current.vite.middlewares(req, res, () => {
        void current.handleRequest(req, res)
      })
    },
    async close() {
      closed = true
      clearTimeout(restartTimer)
      configWatcher.close()
      await restartQueue
      await active?.vite.close()
    },
  }
}
