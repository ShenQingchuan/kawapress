import type { NagiNavItem } from './theme-config'

/**
 * Whether a nav item should look active on `routePath`. An item with
 * `activeMatch` stays active on every page below that prefix, so a section link
 * like "Guide" is highlighted on all guide pages. Without `activeMatch` only the
 * exact page counts. Query, hash and a trailing slash never matter.
 */
export function isNavItemActive(item: NagiNavItem, routePath: string): boolean {
  const path = normalize(routePath)
  const prefix = normalize(item.activeMatch ?? item.link)
  if (item.activeMatch === undefined) {
    return path === prefix
  }
  return path === prefix || path.startsWith(`${prefix}/`)
}

function normalize(route: string): string {
  const path = route.split(/[?#]/, 1)[0]
  return path.length > 1 ? path.replace(/\/$/, '') : path
}
