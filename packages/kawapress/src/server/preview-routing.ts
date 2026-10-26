import { decodeUrlPathname, normalizeBase, withoutBase } from '../core/base'

/**
 * What the preview server should do with one request for the built site.
 *
 * The plan is computed without touching the file system so that the routing
 * rules stay testable. `static` carries the candidate files inside `dist`, in
 * the order they should be probed.
 */
export type PreviewPlan
  = | { kind: 'redirect', location: string }
    | { kind: 'static', candidates: string[] }
    | { kind: 'not-found' }

/**
 * Map a raw request URL onto the preview behaviour for a site served under
 * `base`. The built site keeps its own directory layout, so every request is
 * first stripped of `base` and then probed as an exact file, a `.html` page or
 * a directory index.
 */
export function planPreviewRequest(
  rawUrl: string,
  base: string,
): PreviewPlan {
  const pathname = decodeUrlPathname(splitRequestUrl(rawUrl))
  const normalizedBase = normalizeBase(base)

  if (pathname === '/' && normalizedBase !== '/') {
    return { kind: 'redirect', location: normalizedBase }
  }

  const sitePath = withoutBase(pathname, normalizedBase)
  if (sitePath === undefined || escapesDist(sitePath)) {
    return { kind: 'not-found' }
  }

  return { kind: 'static', candidates: resolveCandidates(sitePath) }
}

function splitRequestUrl(rawUrl: string): string {
  const [pathname = '/'] = rawUrl.split(/[?#]/)
  return pathname.startsWith('/') ? pathname : `/${pathname}`
}

/**
 * Reject path segments that could leave `dist` once the request is rewritten
 * into a file path, for example `/../kawapress.config.ts`.
 */
function escapesDist(sitePath: string): boolean {
  return sitePath
    .split('/')
    .some(segment => segment === '..' || segment === '.')
}

function resolveCandidates(sitePath: string): string[] {
  const relative = sitePath.replace(/^\/+/, '')
  if (!relative) {
    return ['index.html']
  }
  if (sitePath.endsWith('/')) {
    return [`${relative}index.html`]
  }
  return [relative, `${relative}.html`, `${relative}/index.html`]
}
