import type { MaybePromise } from 'kawapress'
import type { LinkItem, SitemapItemLoose, SitemapStreamOptions } from 'sitemap'

export type SitemapPluginItem = Omit<SitemapItemLoose, 'url' | 'lastmod' | 'links'> & {
  url: string
  lastmod?: string | number | Date
  links?: LinkItem[]
}

export interface SitemapPluginOptions extends SitemapStreamOptions {
  /**
   * 站点的绝对地址，例如 `https://kawapress.dev`。未设置时插件不生成 sitemap.xml。
   * 站点配置的 `base` 会自动追加，无需重复写入。
   */
  hostname?: string
  /**
   * 是否为每个页面输出 `<lastmod>`。时间来自该 Markdown 文件最后一次 git 提交。
   * 页面 frontmatter 的 `lastUpdated: false` 可关闭单页，`lastUpdated: <Date>` 可手动指定。
   * @default false
   */
  lastUpdated?: boolean
  /**
   * 写入前对条目做增删改，返回 `undefined` 时保留原条目。
   */
  transformItems?: (
    items: SitemapPluginItem[],
  ) => MaybePromise<SitemapPluginItem[] | undefined>
}
