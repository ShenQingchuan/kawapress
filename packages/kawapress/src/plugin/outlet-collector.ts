import type {
  OutletItem,
  OutletItemInput,
  OutletName,
  OutletRegistry,
} from '../core/outlet'
import { assertOutletName, OUTLET_NAMES } from '../core/outlet'

type OutletSide = 'prepend' | 'append'
type OutletAdder = (outlet: OutletName, item: OutletItemInput) => void

export interface OutletCollector {
  /**
   * The two registration functions of one plugin. The plugin name is bound once
   * by the caller so a plugin cannot claim items that belong to another plugin.
   */
  forPlugin: (pluginName: string) => {
    prependToOutlet: OutletAdder
    appendToOutlet: OutletAdder
  }
  /** Freezes the collected items into the registry handed to the Vue app. */
  createRegistry: () => OutletRegistry
}

export function createOutletCollector(): OutletCollector {
  const sides: Record<OutletSide, Map<OutletName, OutletItem[]>> = {
    prepend: new Map(),
    append: new Map(),
  }
  const outletsById = new Map<string, OutletName>()

  function add(
    side: OutletSide,
    pluginName: string,
    outlet: OutletName,
    item: OutletItemInput,
  ): void {
    const method = `${side}ToOutlet`
    assertOutletName(
      outlet,
      `plugin ${JSON.stringify(pluginName)} calling api.${method}()`,
    )

    const localId = item?.id
    if (typeof localId !== 'string' || localId.trim() === '') {
      throw new Error(
        `[${pluginName} / runtime / ${method}] Item id for outlet ${JSON.stringify(outlet)} `
        + `must be a non-empty string. Pass { id: 'my-item', component } to api.${method}().`,
      )
    }

    const id = `${pluginName}:${localId}`
    const existingOutlet = outletsById.get(id)
    if (existingOutlet) {
      throw new Error(
        `[${pluginName} / runtime / ${method}] Duplicate item id ${JSON.stringify(id)} `
        + `(already used for outlet ${JSON.stringify(existingOutlet)}). `
        + `Item ids must be unique per plugin; rename one of the outlet calls.`,
      )
    }

    outletsById.set(id, outlet)
    const items = sides[side].get(outlet) ?? []
    items.push({ id, owner: pluginName, component: item.component })
    sides[side].set(outlet, items)
  }

  return {
    forPlugin: pluginName => ({
      prependToOutlet: (outlet, item) => add('prepend', pluginName, outlet, item),
      appendToOutlet: (outlet, item) => add('append', pluginName, outlet, item),
    }),
    createRegistry() {
      const registry = {} as Record<OutletName, OutletRegistry[OutletName]>
      for (const name of OUTLET_NAMES) {
        registry[name] = Object.freeze({
          prepend: Object.freeze([...(sides.prepend.get(name) ?? [])]),
          append: Object.freeze([...(sides.append.get(name) ?? [])]),
        })
      }
      return Object.freeze(registry)
    },
  }
}
