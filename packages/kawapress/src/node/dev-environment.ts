import type { FSWatcher } from 'node:fs'
import type {
  IncomingMessage,
  Server,
  ServerResponse,
} from 'node:http'
import type { KawapressViteServer } from './vite'
import { readFileSync, watch } from 'node:fs'
import { resolve } from 'node:path'
import { consola } from 'consola'
import {
  CONFIG_FILE_NAME,
  loadSiteConfigWithDependencies,
} from './load-config'
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
  configDependencies: string[]
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
  let scheduleRestart: () => void = () => {}
  const dependencyWatchers = new Map<string, FSWatcher>()
  const dependencyContents = new Map<string, string | undefined>()

  const handleDependencyChange = (file: string): void => {
    const next = readDependency(file)
    if (dependencyContents.has(file) && dependencyContents.get(file) === next) {
      return
    }
    dependencyContents.set(file, next)
    scheduleRestart()
  }

  const syncDependencyWatchers = (files: string[]): void => {
    const next = new Set(files)
    for (const [file, watcher] of dependencyWatchers) {
      if (!next.has(file)) {
        watcher.close()
        dependencyWatchers.delete(file)
        dependencyContents.delete(file)
      }
    }
    for (const file of next) {
      if (!dependencyWatchers.has(file)) {
        dependencyContents.set(file, readDependency(file))
        dependencyWatchers.set(file, watch(file, () => {
          handleDependencyChange(file)
        }))
      }
    }
  }

  const createEnvironment = async (): Promise<ActiveEnvironment> => {
    const loaded = await loadSiteConfigWithDependencies(root)
    const environment = await createViteServer(root, loaded.config, {
      hmr: options.hmr,
      httpServer,
    })
    return {
      ...environment,
      configDependencies: loaded.dependencies,
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
      syncDependencyWatchers(active.configDependencies)
      consola.success('KawaPress: configuration reloaded')
    }
    catch (error) {
      restartError = error
      consola.error('KawaPress: failed to reload configuration', error)
    }
  }

  scheduleRestart = (): void => {
    if (closed) {
      return
    }
    clearTimeout(restartTimer)
    restartTimer = setTimeout(() => {
      restartQueue = restartQueue.then(restart)
    }, RESTART_DELAY)
  }

  active = await createEnvironment()
  syncDependencyWatchers(active.configDependencies)

  const configWatcher = watch(root, (_event, fileName) => {
    if (fileName?.toString() === CONFIG_FILE_NAME) {
      handleDependencyChange(resolve(root, CONFIG_FILE_NAME))
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
      for (const watcher of dependencyWatchers.values()) {
        watcher.close()
      }
      dependencyWatchers.clear()
      dependencyContents.clear()
      await restartQueue
      await active?.vite.close()
    },
  }
}

function readDependency(file: string): string | undefined {
  try {
    return readFileSync(file, 'utf8')
  }
  catch {
    return undefined
  }
}
