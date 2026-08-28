import type { PageBuildArtifact } from 'kawapress'
import type { MarkdownExit } from 'markdown-exit'
import type { DevEnvironment, Plugin } from 'vite'
import type { LlmsSiteContext } from './artifacts'
import type { LlmsPluginOptions } from './types'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isRunnableDevEnvironment, normalizePath } from 'vite'
import { createLlmsArtifacts } from './artifacts'
import {
  SSG_MD_ENTRY_ID,
  SSG_MD_ENVIRONMENT,
  SSG_MD_MARKERS_ID,
} from './constants'
import { renderMarkdownPages } from './ssg/render'
import { transformMarkdownSfc } from './ssg/transform'

export { SSG_MD_ENTRY_ID } from './constants'
const require = createRequire(import.meta.url)
const RESOLVED_SSG_MD_ENTRY_ID = `\0${SSG_MD_ENTRY_ID}`
const RESOLVED_SSG_MD_MARKERS_ID = `\0${SSG_MD_MARKERS_ID}`
const KAWAPRESS_ENTRY_SERVER_PATH = normalizePath(join(
  dirname(require.resolve('kawapress/package.json')),
  'src/client/entries/entry-server.ts',
))
const KAWAPRESS_ENTRY_SERVER_URL = KAWAPRESS_ENTRY_SERVER_PATH.startsWith('/')
  ? `/@fs${KAWAPRESS_ENTRY_SERVER_PATH}`
  : `/@fs/${KAWAPRESS_ENTRY_SERVER_PATH}`
const SSG_MD_RAW_COMPONENT_PATH = normalizePath(fileURLToPath(
  new URL('./components/SsgMarkdown.vue', import.meta.url),
))
const SSG_MD_ROOT_COMPONENT_PATH = normalizePath(fileURLToPath(
  new URL('./components/SsgMarkdownRoot.vue', import.meta.url),
))

export interface LlmsVitePluginOptions {
  getMarkdown: () => MarkdownExit | undefined
  getPages: () => readonly PageBuildArtifact[]
  site: LlmsSiteContext
  pluginOptions: LlmsPluginOptions
}

export function createSsgMarkdownVitePlugin(
  options: LlmsVitePluginOptions,
): Plugin {
  return {
    name: 'kawapress:llms-ssg-md',
    applyToEnvironment(environment) {
      return environment.name === SSG_MD_ENVIRONMENT
    },
    resolveId(id) {
      if (id === SSG_MD_ENTRY_ID) {
        return RESOLVED_SSG_MD_ENTRY_ID
      }
      if (id === SSG_MD_MARKERS_ID) {
        return RESOLVED_SSG_MD_MARKERS_ID
      }
    },
    load(id) {
      if (id === RESOLVED_SSG_MD_ENTRY_ID) {
        return `
export { render, pages, site } from ${JSON.stringify(KAWAPRESS_ENTRY_SERVER_PATH)}
`
      }
      if (id === RESOLVED_SSG_MD_MARKERS_ID) {
        return `
export { default as SsgMarkdown } from ${JSON.stringify(SSG_MD_RAW_COMPONENT_PATH)}
export { default as SsgMarkdownRoot } from ${JSON.stringify(SSG_MD_ROOT_COMPONENT_PATH)}
`
      }
    },
    async transform(code, id) {
      if (!id.endsWith('.md')) {
        return
      }
      const page = options.getPages().find(candidate => candidate.file === id)
      if (!page) {
        throw new Error(
          `KawaPress LLMS: no page artifact was recorded for ${JSON.stringify(id)}.`,
        )
      }
      const markdown = options.getMarkdown()
      if (!markdown) {
        throw new Error(
          'KawaPress LLMS: the Markdown compiler is not available.',
        )
      }
      return transformMarkdownSfc({ artifact: page, code, markdown })
    },
  }
}

export function createLlmsDevMiddlewarePlugin(
  options: LlmsVitePluginOptions,
): Plugin {
  return {
    name: 'kawapress:llms-dev-middleware',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = requestedArtifactPath(request, server.config.base)
        if (!path) {
          next()
          return
        }

        void serveDevArtifact(
          server.environments[SSG_MD_ENVIRONMENT],
          path,
          options,
          response,
        ).catch((error) => {
          response.statusCode = 500
          response.setHeader('Content-Type', 'text/plain; charset=utf-8')
          response.end(error instanceof Error ? error.stack : String(error))
        })
      })
    },
  }
}

async function serveDevArtifact(
  environment: DevEnvironment | undefined,
  path: string,
  options: LlmsVitePluginOptions,
  response: import('node:http').ServerResponse,
): Promise<void> {
  if (!environment || !isRunnableDevEnvironment(environment)) {
    throw new Error('KawaPress LLMS: ssgMarkdown environment is not runnable.')
  }

  const bundle = await environment.runner.import(KAWAPRESS_ENTRY_SERVER_URL) as {
    render: Parameters<typeof renderMarkdownPages>[0]['render']
    pages: Record<string, unknown>
  }
  const activeRoutes = new Set(Object.keys(bundle.pages))
  const pages = options.getPages()
  const rendered = await renderMarkdownPages(
    bundle,
    pages.filter(page => activeRoutes.has(page.routePath)),
  )
  const artifacts = await createLlmsArtifacts(
    rendered,
    options.site,
    options.pluginOptions,
  )
  const content = artifacts.get(path)

  if (content === undefined) {
    response.statusCode = 404
    response.setHeader('Content-Type', 'text/plain; charset=utf-8')
    response.end('KawaPress LLMS: Markdown artifact not found.')
    return
  }

  response.statusCode = 200
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  response.end(content)
}

function requestedArtifactPath(
  request: import('node:http').IncomingMessage,
  base: string,
): string | undefined {
  const requestUrl = request.url ?? '/'
  if (
    requestUrl.includes('?')
    || request.headers['sec-fetch-dest'] === 'script'
  ) {
    return
  }

  let pathname: string
  try {
    pathname = decodeURIComponent(requestUrl.split('#')[0])
  }
  catch {
    return
  }

  const prefix = base === '/' ? '/' : base
  if (!pathname.startsWith(prefix)) {
    return
  }
  const path = pathname.slice(prefix.length).replace(/^\/+/, '')
  if (path.startsWith('@') || path.startsWith('__')) {
    return
  }
  if (
    path === 'llms.txt'
    || path === 'llms-full.txt'
    || /^(?:[^/]+\/)+llms(?:-full)?\.txt$/.test(path)
    || path.endsWith('.md')
  ) {
    return path
  }
}

export function ssgMarkdownDefine(): Record<string, string> {
  return {
    'import.meta.env.SSG_MD': 'true',
  }
}
