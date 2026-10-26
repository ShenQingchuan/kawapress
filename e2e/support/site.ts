import process from 'node:process'

/**
 * The site under test is built and served with the base from `KAWAPRESS_BASE`,
 * so every URL used by the specs has to be built from that same base.
 *
 * KawaPress normalises the base to a leading and trailing slash. This helper
 * mirrors that rule locally because the e2e package must not import KawaPress
 * source files (Playwright does not transpile workspace sources).
 */
export function normalizeBase(base: string): string {
  const normalized = `/${base.split('/').filter(Boolean).join('/')}`
  return normalized === '/' ? '/' : `${normalized}/`
}

export const base = normalizeBase(process.env.KAWAPRESS_BASE ?? '/')

/** Absolute URL path of a site route, including the configured base. */
export function sitePath(route: string): string {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`
  return base === '/' ? normalizedRoute : `${base.slice(0, -1)}${normalizedRoute}`
}

export const previewPort = Number(process.env.E2E_PREVIEW_PORT ?? 4173)

/** `kawapress dev` always listens on its default port; the CLI has no --port yet. */
export const devPort = 5173

export const previewOrigin = `http://localhost:${previewPort}`
export const devOrigin = `http://localhost:${devPort}`

/**
 * The plugin fixture site (`e2e/fixtures/plugins-site`) runs next to the docs
 * site so plugins that are useless in the docs configuration still get E2E
 * coverage. It reuses the same base as the docs site.
 */
export const pluginsPort = Number(process.env.E2E_PLUGINS_PORT ?? 4174)

export const pluginsOrigin = `http://localhost:${pluginsPort}`
