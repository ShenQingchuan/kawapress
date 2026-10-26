import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The prerendered HTML files are the most reliable route list: `kawapress
 * build` writes exactly one file per route before the tests run, while
 * `llms.txt` and `sitemap.xml` come from optional plugins and may be missing or
 * filtered. So the specs read the built `docs/dist` directory instead of
 * keeping a hand-written list in sync with the documentation.
 */
const distDir = fileURLToPath(new URL('../../docs/dist', import.meta.url))

export function discoverRoutes(): string[] {
  const routes = collectHtmlFiles(distDir)
    // The not-found page is a fallback response, not a route of its own.
    .filter(file => file !== '404.html')
    .map(htmlFileToRoute)
    .sort()

  if (routes.length === 0) {
    throw new Error(
      `KawaPress E2E: no prerendered HTML found in ${distDir}. Run \`pnpm test:e2e\` so the docs site gets built first.`,
    )
  }
  return routes
}

function collectHtmlFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    if (entry.name.startsWith('.')) {
      return []
    }
    if (entry.isDirectory()) {
      return collectHtmlFiles(join(dir, entry.name))
        .map(file => `${entry.name}/${file}`)
    }
    return entry.name.endsWith('.html') ? [entry.name] : []
  })
}

/**
 * Mirror the route-to-file contract of the prerenderer: `guide/intro.html`
 * serves `/guide/intro`, while both `index.html` and `guide/index.html` belong
 * to the directory route (`/` and `/guide`).
 */
function htmlFileToRoute(file: string): string {
  const withoutExtension = file.slice(0, -'.html'.length)
  if (withoutExtension === 'index') {
    return '/'
  }
  if (withoutExtension.endsWith('/index')) {
    return withoutExtension.slice(0, -'/index'.length)
  }
  return `/${withoutExtension}`
}
