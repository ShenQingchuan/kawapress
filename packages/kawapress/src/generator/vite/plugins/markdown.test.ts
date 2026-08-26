import type { MarkdownPageLoader } from '../../../compiler/page-loader'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { markdownPlugin } from './markdown'

describe('markdownPlugin', () => {
  it('loads Markdown as a Vue SFC before the transform pipeline', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kawapress-markdown-plugin-'))
    const file = join(directory, 'page.md')
    const calls: Array<{ file: string, source: string }> = []
    const pageLoader: MarkdownPageLoader = {
      sourceRoot: directory,
      async load(source, loadedFile) {
        calls.push({ file: loadedFile, source })
        return {
          html: '<h1 id="hello">Hello</h1>\n',
          env: { path: '/page' },
          pageData: {
            path: '/page',
            title: 'Hello',
            frontmatter: {},
            headers: [],
          },
        }
      },
    }

    try {
      await writeFile(file, '# Hello\n')
      const plugin = markdownPlugin(pageLoader)
      const load = plugin.load

      expect(plugin.enforce).toBeUndefined()
      expect(plugin.transform).toBeUndefined()
      expect(typeof load).toBe('function')
      if (typeof load !== 'function') {
        return
      }

      await expect(load.call({} as never, `${file}?raw`)).resolves.toBeNull()
      const result = await load.call({} as never, file)

      expect(calls).toEqual([{
        file,
        source: await readFile(file, 'utf8'),
      }])
      expect(result).toContain('<template><h1 id="hello">Hello</h1>')
    }
    finally {
      await rm(directory, { force: true, recursive: true })
    }
  })
})
