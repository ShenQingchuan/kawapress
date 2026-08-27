import type { EnvironmentModuleNode, Plugin } from 'vite'
import { Buffer } from 'node:buffer'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveSiteConfig } from '../../config'
import { createDataLoaderContext } from '../../data/context'
import { dataLoaderPlugin } from './data'

interface GeneratedDataModule<T> {
  data: T
}

describe('dataLoaderPlugin', () => {
  it('runs Node-only loaders once and reloads watched files and local dependencies', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-data-loader-'))
    const loaderFile = join(root, 'content/example.data.ts')
    const helperFile = join(root, 'content/helper.ts')
    const watchedFile = join(root, 'content/data/message.txt')
    const callsFile = join(root, 'calls.txt')

    try {
      await mkdir(join(root, 'content/data'), { recursive: true })
      await Promise.all([
        writeFile(join(root, 'package.json'), '{"type":"module"}\n'),
        writeFile(helperFile, 'export const prefix = "first"\n'),
        writeFile(watchedFile, 'hello\n'),
        writeFile(loaderFile, `
import { appendFileSync, readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { prefix } from './helper.ts'

export default {
  watch: './data/*.txt',
  load(files) {
    appendFileSync(${JSON.stringify(callsFile)}, 'run\\n')
    return {
      base: globalThis.KAWAPRESS_CONFIG?.site.base,
      files: files.map(file => basename(file)),
      message: prefix + ': ' + readFileSync(files[0], 'utf8').trim(),
    }
  },
}
`),
      ])

      const plugin = await createPlugin(root)
      const firstSource = await runLoad(plugin, loaderFile)
      const repeatedSource = await runLoad(plugin, loaderFile)
      const first = await importGeneratedData<{
        base: string
        files: string[]
        message: string
      }>(firstSource)

      expect(repeatedSource).toBe(firstSource)
      expect(first.data).toEqual({
        base: '/docs/',
        files: ['message.txt'],
        message: 'first: hello',
      })
      await expect(readFile(callsFile, 'utf8')).resolves.toBe('run\n')

      await writeFile(watchedFile, 'updated\n')
      await expect(runHotUpdate(plugin, watchedFile, loaderFile, 1))
        .resolves
        .toHaveLength(1)
      const watched = await importGeneratedData<{ message: string }>(
        await runLoad(plugin, loaderFile),
      )
      expect(watched.data.message).toBe('first: updated')

      await writeFile(helperFile, 'export const prefix = "second"\n')
      await expect(runHotUpdate(plugin, helperFile, loaderFile, 2))
        .resolves
        .toHaveLength(1)
      const dependency = await importGeneratedData<{ message: string }>(
        await runLoad(plugin, loaderFile),
      )
      expect(dependency.data.message).toBe('second: updated')
      await expect(readFile(callsFile, 'utf8')).resolves.toBe(
        'run\nrun\nrun\n',
      )
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  it('rejects data that cannot cross the JSON boundary', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-data-json-'))
    const loaderFile = join(root, 'invalid.data.ts')

    try {
      await Promise.all([
        writeFile(join(root, 'package.json'), '{"type":"module"}\n'),
        writeFile(loaderFile, `
export default {
  load() {
    return { createdAt: new Date('2026-01-01') }
  },
}
`),
      ])
      const plugin = await createPlugin(root)

      await expect(runLoad(plugin, loaderFile)).rejects.toThrow(
        /data returned by loader "invalid\.data\.ts" is not JSON-serializable\.[\s\S]*data\.createdAt/,
      )
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })
})

async function createPlugin(root: string): Promise<Plugin> {
  const config = await resolveSiteConfig({
    base: '/docs/',
    srcDir: 'content',
  })
  return dataLoaderPlugin(createDataLoaderContext(root, config))
}

async function runLoad(plugin: Plugin, id: string): Promise<string> {
  const load = plugin.load
  if (typeof load !== 'function') {
    throw new TypeError('Expected a load hook')
  }
  const result = await load.call({} as never, id)
  if (typeof result !== 'string') {
    throw new TypeError('Expected generated JavaScript')
  }
  return result
}

async function runHotUpdate(
  plugin: Plugin,
  file: string,
  loaderId: string,
  timestamp: number,
): Promise<EnvironmentModuleNode[] | void> {
  const hotUpdate = plugin.hotUpdate
  if (typeof hotUpdate !== 'function') {
    throw new TypeError('Expected a hotUpdate hook')
  }

  const module = { id: loaderId } as EnvironmentModuleNode
  return hotUpdate.call({
    environment: {
      moduleGraph: {
        getModuleById(id: string) {
          return id === loaderId ? module : undefined
        },
      },
    },
  } as never, {
    file,
    modules: [],
    read: () => '',
    server: {} as never,
    timestamp,
    type: 'update',
  })
}

async function importGeneratedData<T>(
  source: string,
): Promise<GeneratedDataModule<T>> {
  const encoded = Buffer.from(source).toString('base64')
  return import(`data:text/javascript;base64,${encoded}#${Math.random()}`)
}
