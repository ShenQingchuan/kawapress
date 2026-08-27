import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildSite } from './build'

describe('build-time data loading', () => {
  it('shares one Node-side result between the SSR and client builds', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-data-build-'))
    const callsFile = join(root, 'loader-calls.txt')

    try {
      await mkdir(join(root, 'posts'), { recursive: true })
      await Promise.all([
        writeFile(join(root, 'package.json'), '{"type":"module"}\n'),
        writeFile(join(root, 'kawapress.config.ts'), `
import { nagi } from 'kawapress/nagi'

export default nagi({ base: '/reference/' })
`),
        writeFile(join(root, 'build.data.ts'), `
import { appendFileSync } from 'node:fs'
import { defineLoader } from 'kawapress'

export interface Data {
  base: string
  message: string
}

declare const data: Data
export { data }

export default defineLoader({
  load(): Data {
    appendFileSync(${JSON.stringify(callsFile)}, 'run\\n')
    return {
      base: globalThis.KAWAPRESS_CONFIG?.site.base ?? '',
      message: 'Loaded <safely>',
    }
  },
})
`),
        writeFile(join(root, 'posts.data.ts'), `
import { createContentLoader } from 'kawapress'

export default createContentLoader('posts/*.md', {
  transform(posts) {
    return { count: posts.length }
  },
})
`),
        writeFile(join(root, 'posts/first.md'), '# First post\n'),
        writeFile(join(root, 'index.md'), `
<script setup lang="ts">
import { data } from './build.data.ts'
import { data as posts } from './posts.data.ts'
</script>

# Data loading

<p id="loaded-data">{{ data.message }} at {{ data.base }}</p>
<p id="loaded-content">Posts: {{ posts.count }}</p>
`),
      ])

      await buildSite(root)

      const html = await readFile(join(root, 'dist/index.html'), 'utf8')
      expect(html).toContain(
        '<p id="loaded-data">Loaded &lt;safely&gt; at /reference/</p>',
      )
      expect(html).toContain('<p id="loaded-content">Posts: 1</p>')
      await expect(readFile(callsFile, 'utf8')).resolves.toBe('run\n')

      const assetDir = join(root, 'dist/assets')
      const scripts = (await readdir(assetDir))
        .filter(file => file.endsWith('.js'))
      const clientCode = (await Promise.all(
        scripts.map(file => readFile(join(assetDir, file), 'utf8')),
      )).join('\n')
      expect(clientCode).not.toContain('gray-matter')
      expect(clientCode).not.toContain('createContentLoader().load()')
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  }, 15_000)
})
