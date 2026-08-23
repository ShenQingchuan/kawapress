import { existsSync, readFileSync } from 'node:fs'
import { createServer as createHttpServer } from 'node:http'
import { join } from 'node:path'
import { consola } from 'consola'
import sirv from 'sirv'

const PORT = 4173

export async function previewSite(root: string) {
  const distDir = join(root, 'dist')
  const notFoundPath = join(distDir, '404.html')
  if (!existsSync(notFoundPath)) {
    throw new Error('KawaPress: no build output found. Run `kawapress build` first.')
  }

  const notFoundHtml = readFileSync(notFoundPath, 'utf-8')
  const assets = sirv(distDir, { extensions: ['html'] })

  const server = createHttpServer((req, res) => {
    assets(req, res, () => {
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(notFoundHtml)
    })
  })

  await new Promise<void>(resolve => server.listen(PORT, resolve))
  consola.ready(`KawaPress: preview running at http://localhost:${PORT}`)
}
