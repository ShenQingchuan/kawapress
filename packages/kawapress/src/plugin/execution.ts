import type { MaybePromise } from '../api/plugin'

type PluginSurface = 'generator' | 'runtime'
type PluginHandler<T> = (value: T) => MaybePromise<void>

interface RegisteredPluginHandler<T> {
  pluginName: string
  handler: PluginHandler<T>
}

interface PluginHandlerRegistryOptions<T> {
  beforeEachHandle?: PluginHandler<T>
  afterEachHandle?: PluginHandler<T>
}

export interface PluginHandlerRegistry<T> {
  add: (pluginName: string, handler: PluginHandler<T>) => void
  run: (value: T) => Promise<void>
}

export function createPluginHandlerRegistry<T>(
  surface: PluginSurface,
  capability: string,
  options: PluginHandlerRegistryOptions<T> = {},
): PluginHandlerRegistry<T> {
  const handlers: RegisteredPluginHandler<T>[] = []

  return {
    add(pluginName, handler) {
      handlers.push({ pluginName, handler })
    },
    async run(value) {
      for (const { pluginName, handler } of handlers) {
        await runPluginHook(
          surface,
          pluginName,
          capability,
          async () => {
            await options.beforeEachHandle?.(value)
            await handler(value)
            await options.afterEachHandle?.(value)
          },
        )
      }
    },
  }
}

export async function runPluginSetup(
  surface: PluginSurface,
  pluginName: string,
  setup: () => MaybePromise<void>,
): Promise<void> {
  await runPluginHook(surface, pluginName, 'setup', setup)
}

async function runPluginHook(
  surface: PluginSurface,
  pluginName: string,
  capability: string,
  hook: () => MaybePromise<void>,
): Promise<void> {
  try {
    await hook()
  }
  catch (cause) {
    const detail = cause instanceof Error ? `\n${cause.message}` : ''
    throw new Error(
      `[${pluginName} / ${surface} / ${capability}] Plugin execution failed. ${detail}`,
      { cause },
    )
  }
}
