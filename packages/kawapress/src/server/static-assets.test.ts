import { Buffer } from 'node:buffer'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildSite } from './build'

describe('static assets', () => {
  it('uses srcDir/public, fingerprints referenced assets, and excludes public Markdown from routes', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-assets-'))
    const image = Buffer.alloc(5000, 1)
    const icon = '<svg xmlns="http://www.w3.org/2000/svg"><title>Icon</title></svg>'

    try {
      await mkdir(join(root, 'content/guide'), { recursive: true })
      await mkdir(join(root, 'content/public'), { recursive: true })
      await Promise.all([
        writeFile(join(root, 'kawapress.config.ts'), `
import { nagi } from 'kawapress/nagi'

export default nagi({
  base: '/guide-base/',
  srcDir: 'content',
})
`),
        writeFile(join(root, 'content/guide/assets.md'), `
# Static assets

![Relative asset](../image.png)

![Public asset](/icon.svg)
`),
        writeFile(join(root, 'content/image.png'), image),
        writeFile(join(root, 'content/public/icon.svg'), icon),
        writeFile(join(root, 'content/public/inside-public.md'), '# Not a route\n'),
      ])

      await buildSite(root)

      const page = await readFile(join(root, 'dist/guide/assets.html'), 'utf8')
      expect(page).toMatch(/src="\/guide-base\/assets\/image-[^"]+\.png"/)
      expect(page).toContain('src="/guide-base/icon.svg"')
      await expect(readFile(join(root, 'dist/icon.svg'), 'utf8')).resolves.toBe(icon)
      await expect(readFile(join(root, 'dist/inside-public.md'), 'utf8')).resolves.toBe('# Not a route\n')
      await expect(readFile(join(root, 'dist/inside-public.html'), 'utf8')).rejects.toThrow()
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })
})
