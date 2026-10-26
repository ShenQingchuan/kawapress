import type {
  OutletItem,
  OutletItemInput,
  OutletName,
  OutletRegistry,
} from '../core/outlet'
import { assertOutletName, OUTLET_NAMES } from '../core/outlet'

export interface OutletCollector {
  /**
   * Registers an item for one plugin. The plugin name is bound once by the
   * caller so a plugin cannot claim items that belong to another plugin.
   */
  addForPlugin: (pluginName: string) => (outlet: OutletName, item: OutletItemInput) => void
  /** Freezes the collected items into the registry handed to the Vue app. */
  createRegistry: () => OutletRegistry
}

export function createOutletCollector(): OutletCollector {
  const itemsByOutlet = new Map<OutletName, OutletItem[]>()
  const outletsById = new Map<string, OutletName>()

  function add(pluginName: string, outlet: OutletName, item: OutletItemInput): void {
    assertOutletName(
      outlet,
      `plugin ${JSON.stringify(pluginName)} calling api.addToOutlet()`,
    )

    const localId = item?.id
    if (typeof localId !== 'string' || localId.trim() === '') {
      throw new Error(
        `[${pluginName} / runtime / addToOutlet] Item id for outlet ${JSON.stringify(outlet)} `
        + `must be a non-empty string. Pass { id: 'my-item', component } to api.addToOutlet().`,
      )
    }

    const id = `${pluginName}:${localId}`
    const existingOutlet = outletsById.get(id)
    if (existingOutlet) {
      throw new Error(
        `[${pluginName} / runtime / addToOutlet] Duplicate item id ${JSON.stringify(id)} `
        + `(already used for outlet ${JSON.stringify(existingOutlet)}). `
        + `Item ids must be unique per plugin; rename one of the api.addToOutlet() calls.`,
      )
    }

    outletsById.set(id, outlet)
    const items = itemsByOutlet.get(outlet) ?? []
    items.push({
      id,
      owner: pluginName,
      component: item.component,
    })
    itemsByOutlet.set(outlet, items)
  }

  return {
    addForPlugin: pluginName => (outlet, item) => {
      add(pluginName, outlet, item)
    },
    createRegistry() {
      const registry = {} as Record<OutletName, readonly OutletItem[]>
      for (const name of OUTLET_NAMES) {
        registry[name] = Object.freeze([...(itemsByOutlet.get(name) ?? [])])
      }
      return Object.freeze(registry)
    },
  }
}
