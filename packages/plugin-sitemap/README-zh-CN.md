# @kawapress/plugin-sitemap

KawaPress 的 sitemap.xml 输出，支持多语言备选链接和最后修改时间。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-sitemap?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-sitemap) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-sitemap/README.md)

`@kawapress/plugin-sitemap` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 默认关闭，设置了 `hostname` 才会生成文件。
- 站点的 `base` 会自动加到地址上。
- 有多种语言版本的页面，会把彼此列为备选链接。
- 可选的 `<lastmod>`，来自每个 Markdown 文件最后一次 git 提交。
- 页面可以在 frontmatter 里写 `sitemap: false` 退出。

## 安装

这个包已经包含在 `kawapress` 里。使用 `kawapress/nagi` 的站点自带它，不需要再安装。

只有不使用 nagi 预设搭建站点时，才需要单独安装它。

```sh
npm install --save-dev @kawapress/plugin-sitemap
```

也可以用 `pnpm add --save-dev @kawapress/plugin-sitemap` 或 `yarn add --dev @kawapress/plugin-sitemap`。

## 使用

```ts
import sitemapPlugin from '@kawapress/plugin-sitemap'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    sitemapPlugin({
      hostname: 'https://example.com',
      lastUpdated: true,
    }),
  ],
})
```

文件写到 `dist/sitemap.xml`。它不会生成 `robots.txt`。

## 配置项

| 选项 | 说明 |
| --- | --- |
| `hostname` | 站点的绝对地址。不设置就不生成文件。 |
| `lastUpdated` | 给每个页面加 `<lastmod>`，来自 git 历史，默认关闭。 |
| `transformItems` | 在写文件之前增、删、改条目。 |

## 文档

[文档](https://kawapress.dev/plugins/sitemap) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
