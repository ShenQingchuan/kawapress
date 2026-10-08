import type { LocaleConfig } from 'kawapress'
import type { SitemapPluginOptions } from './types'
import { resolve } from 'node:path'
import process from 'node:process'
import { consola } from 'consola'
import { definePlugin } from 'kawapress'
import { SitemapStream, streamToPromise } from 'sitemap'
import { readGitLastUpdated } from './git'
import { resolveSitemapHostname } from './hostname'
import { createSitemapItems } from './items'

const MAX_SITEMAP_URLS = 50000

export function sitemapPlugin(options: SitemapPluginOptions = {}) {
  let root = process.cwd()
  let base = '/'
  let locales: Record<string, LocaleConfig> | undefined

  return definePlugin({
    name: '@kawapress/plugin-sitemap',
    setup(api) {
      api.config((config) => {
        base = config.base ?? '/'
        locales = config.locales
      })
      api.vite((config) => {
        root = config.root ? resolve(config.root) : process.cwd()
      })
      api.buildArtifacts(async ({ pages, emitFile }) => {
        // 未设置 hostname 时保持关闭：不输出日志，也不生成文件
        if (!options.hostname) {
          return
        }

        consola.start('sitemap 正在生成中…')
        const hostname = resolveSitemapHostname(options.hostname, base)
        const gitLastUpdated = options.lastUpdated
          ? await readGitLastUpdated(root)
          : undefined
        let items = createSitemapItems({
          pages,
          locales,
          lastUpdated: options.lastUpdated ?? false,
          gitLastUpdated,
        })
        items = (await options.transformItems?.(items)) || items
        if (items.length > MAX_SITEMAP_URLS) {
          throw new RangeError(`sitemap 条目数 ${items.length} 超过单文件上限 ${MAX_SITEMAP_URLS}，暂不支持 sitemap index`)
        }

        const { lastUpdated: _lastUpdated, transformItems: _transformItems, ...streamOptions } = options
        const stream = new SitemapStream({ ...streamOptions, hostname })
        for (const item of items) {
          stream.write(item)
        }
        stream.end()
        const xml = (await streamToPromise(stream)).toString()

        await emitFile('sitemap.xml', xml)
        consola.success(`sitemap 已生成：共计 ${items.length} 个条目`)
      })
    },
  })
}

export default sitemapPlugin
