import type { Component } from 'vue'

/**
 * Every outlet a theme can render. The list is the public contract between
 * plugins (which place interface pieces) and themes (which place the sockets).
 */
export const OUTLET_NAMES = [
  'header.actions',
  'doc.header',
  'doc.footer',
  'doc.after',
] as const

export type OutletName = typeof OUTLET_NAMES[number]

/** What a plugin passes to `api.addToOutlet()`. */
export interface OutletItemInput {
  id: string
  component: Component
}

/** A collected outlet item. `id` and `owner` are filled in by KawaPress. */
export interface OutletItem extends OutletItemInput {
  /** Full id, `<plugin name>:<plugin local id>`. */
  id: string
  /** Name of the plugin that registered the item. */
  owner: string
}

/** Outlet items grouped by outlet name, in render order. */
export type OutletRegistry = Readonly<
  Record<OutletName, readonly OutletItem[]>
>

export function isOutletName(value: unknown): value is OutletName {
  return typeof value === 'string'
    && (OUTLET_NAMES as readonly string[]).includes(value)
}

export function assertOutletName(
  value: unknown,
  context: string,
): asserts value is OutletName {
  if (isOutletName(value)) {
    return
  }
  throw new Error(
    `KawaPress: ${context} uses the unknown outlet ${JSON.stringify(value)}. `
    + `Available outlets: ${OUTLET_NAMES.join(', ')}.`,
  )
}

export function getOutletItems(
  registry: OutletRegistry,
  outlet: OutletName,
): readonly OutletItem[] {
  return registry[outlet] ?? []
}

/** One registered item that no page ever rendered. */
export interface UnconsumedOutletItem {
  owner: string
  outlet: OutletName
  id: string
}

/**
 * Compares the registry with the outlets that pages actually rendered.
 * `renderedOutlets` may contain names this build does not know; they are
 * ignored on purpose so a stale page cannot hide a warning.
 */
export function findUnconsumedOutletItems(
  registry: OutletRegistry,
  renderedOutlets: Iterable<string>,
): UnconsumedOutletItem[] {
  const rendered = new Set(renderedOutlets)
  return OUTLET_NAMES.flatMap(outlet => (
    rendered.has(outlet)
      ? []
      : getOutletItems(registry, outlet).map(item => ({
          owner: item.owner,
          outlet,
          id: item.id,
        }))
  ))
}

/**
 * One warning line per owner plugin, naming the plugin, the outlet, and the
 * item id, so the site author knows which plugin lost its socket.
 */
export function formatUnconsumedOutletWarnings(
  items: readonly UnconsumedOutletItem[],
): string[] {
  const itemsByOwner = new Map<string, UnconsumedOutletItem[]>()
  for (const item of items) {
    const owned = itemsByOwner.get(item.owner) ?? []
    owned.push(item)
    itemsByOwner.set(item.owner, owned)
  }

  return [...itemsByOwner].map(([owner, owned]) => {
    const places = owned
      .map(item => `${item.outlet} (item ${JSON.stringify(item.id)})`)
      .join(', ')
    return `KawaPress: plugin ${JSON.stringify(owner)} added items to outlets that no page rendered: `
      + `${places}. Render <KawaOutlet name="..." /> for these outlets in the site theme, `
      + `or stop adding the items.`
  })
}
