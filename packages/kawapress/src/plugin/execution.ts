import type { MaybePromise } from '../api/plugin'

type PluginSurface = 'generator' | 'runtime'
type PluginHandler<T, C = undefined> = (value: T, context: C) => MaybePromise<void>

interface RegisteredPluginHandler<T, C> {
  pluginName: string
  handler: PluginHandler<T, C>
}

interface PluginHandlerRegistryOptions<T> {
  beforeEachHandle?: (value: T) => MaybePromise<void>
  afterEachHandle?: (value: T) => MaybePromise<void>
}

/**
 * Ordered handlers of one plugin capability. `C` is an optional read-only
 * context passed next to the value, e.g. the source file of a page.
 */
export interface PluginHandlerRegistry<T, C = undefined> {
  add: (pluginName: string, handler: PluginHandler<T, C>) => void
  run: (...args: C extends undefined ? [value: T] : [value: T, context: C]) => Promise<void>
}

export function createPluginHandlerRegistry<T, C = undefined>(
  surface: PluginSurface,
  capability: string,
  options: PluginHandlerRegistryOptions<T> = {},
): PluginHandlerRegistry<T, C> {
  const handlers: RegisteredPluginHandler<T, C>[] = []

  return {
    add(pluginName, handler) {
      handlers.push({ pluginName, handler })
    },
    async run(...[value, context]) {
      for (const { pluginName, handler } of handlers) {
        await runPluginHook(
          surface,
          pluginName,
          capability,
          async () => {
            await options.beforeEachHandle?.(value)
            await handler(value, context as C)
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
