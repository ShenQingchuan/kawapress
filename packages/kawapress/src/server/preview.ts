import type { ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createServer as createHttpServer } from 'node:http'
import { join } from 'node:path'
import { consola } from 'consola'
import sirv from 'sirv'
import { loadSiteConfig } from '../generator/load-config'
import { planPreviewRequest } from './preview-routing'

const DEFAULT_PORT = 4173

export interface PreviewSiteOptions {
  port?: number
}

export async function previewSite(
  root: string,
  options: PreviewSiteOptions = {},
) {
  const port = resolvePort(options.port)
  const distDir = join(root, 'dist')
  const notFoundPath = join(distDir, '404.html')
  if (!existsSync(notFoundPath)) {
    throw new Error(
      `KawaPress: no build output found at ${notFoundPath}. Run \`kawapress build\` in ${root} first.`,
    )
  }

  const siteConfig = await loadSiteConfig(root)
  const notFoundHtml = readFileSync(notFoundPath, 'utf-8')
  const assets = sirv(distDir)

  const server = createHttpServer((req, res) => {
    const plan = planPreviewRequest(req.url ?? '/', siteConfig.base)

    if (plan.kind === 'redirect') {
      res.statusCode = 302
      res.setHeader('Location', plan.location)
      res.end()
      return
    }

    const file = plan.kind === 'static'
      ? findBuiltFile(distDir, plan.candidates)
      : undefined
    if (!file) {
      sendNotFound(res, notFoundHtml)
      return
    }

    req.url = `/${file}`
    assets(req, res, () => sendNotFound(res, notFoundHtml))
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', (error: NodeJS.ErrnoException) => {
      reject(error.code === 'EADDRINUSE'
        ? new Error(
            `KawaPress: port ${port} is already in use. Choose another one with \`kawapress preview --port <number>\`.`,
          )
        : error)
    })
    server.listen(port, () => resolve())
  })

  const { port: listeningPort } = server.address() as AddressInfo
  consola.ready(
    `KawaPress: preview running at http://localhost:${listeningPort}${siteConfig.base}`,
  )
}

function findBuiltFile(distDir: string, candidates: string[]): string | undefined {
  return candidates.find((candidate) => {
    const file = join(distDir, candidate)
    return existsSync(file) && statSync(file).isFile()
  })
}

function sendNotFound(res: ServerResponse, notFoundHtml: string): void {
  res.statusCode = 404
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(notFoundHtml)
}

function resolvePort(port: number | undefined): number {
  if (port === undefined) {
    return DEFAULT_PORT
  }
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new RangeError(
      `KawaPress: --port must be an integer between 0 and 65535, got ${JSON.stringify(port)}.`,
    )
  }
  return port
}
