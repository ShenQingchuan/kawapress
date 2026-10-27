---
title: 站点地图
description: 生成 sitemap.xml，帮助搜索引擎发现站点的全部页面，并支持多语言与最后修改时间。
---

# 站点地图

`sitemap.xml` 列出站点的全部页面地址，搜索引擎据此发现和抓取内容。KawaPress 通过 `@kawapress/plugin-sitemap` 生成它。默认 nagi 预设已经组合这个插件，但它默认关闭，需要设置 `hostname` 才会生成。

## 启用站点地图 {#enable-sitemap}

在 `kawapress.config.ts` 中设置 `sitemap.hostname`。它是站点的绝对地址，必须以 `http://` 或 `https://` 开头：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  base: '/handbook/',
  sitemap: {
    hostname: 'https://example.com',
  },
})
```

插件会自动把 `base` 追加到 `hostname` 后面，因此无需重复写入。上面的配置生成的页面地址形如 `https://example.com/handbook/guide/routing`。

未设置 `hostname` 时，构建不会生成文件，也不会输出 sitemap 相关日志。

开启后，构建过程中会输出 `sitemap 正在生成中…`，生成完成后输出条目数量。文件写入构建输出的根目录，即 `dist/sitemap.xml`。部署后，它的地址是 `https://example.com/handbook/sitemap.xml`。

## 页面范围 {#page-scope}

sitemap 只包含构建时已经生成的页面。在页面 frontmatter 中写入 `sitemap: false`，可以把该页排除在外：

```md
---
sitemap: false
---
```

## 多语言 {#multiple-locales}

同一篇文档在不同语言下的页面，会在彼此的条目中写入 `xhtml:link` 备选地址。每个地址都包含全部语言变体，包括它自己。`lang` 取自 `locales` 配置中的 `lang` 字段。只有一种语言的页面不写备选地址。

## 最后修改时间 {#last-modified}

设置 `lastUpdated: true` 后，每个页面会写入 `<lastmod>`。时间取自该 Markdown 文件最后一次 git 提交：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  sitemap: {
    hostname: 'https://example.com',
    lastUpdated: true,
  },
})
```

使用这个选项时，请注意以下几点：

- 插件只读取 git 历史，不读取文件的修改时间。CI 检出代码后，文件的修改时间通常都相同，因此不可靠。
- 仓库是浅克隆时，插件输出 warning 并跳过 `<lastmod>`，不会写入错误日期。在 GitHub Actions 中使用 `actions/checkout` 时，请设置 `fetch-depth: 0`。
- 不在 git 仓库中时，同样输出 warning 并跳过 `<lastmod>`。

单个页面可以在 frontmatter 中覆盖这个行为。`lastUpdated: false` 会关闭该页的 `<lastmod>`。日期字符串会被用作该页的修改时间：

```md
---
lastUpdated: '2023-05-06'
---
```

日期必须加引号。未加引号的 YAML 日期会被解析成 `Date` 对象，而 KawaPress 页面数据只接受可以序列化为 JSON 的值，因此构建会报错。无法解析的日期字符串同样会报错。

frontmatter 中的 `lastUpdated` 只在站点设置 `lastUpdated: true` 时生效。

## 修改条目 {#transform-items}

`transformItems` 在写入文件前接收全部条目，可以增加、删除或修改它们。返回 `undefined` 时保留原有条目：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  sitemap: {
    hostname: 'https://example.com',
    transformItems(items) {
      return items.filter(item => !item.url.startsWith('draft'))
    },
  },
})
```

每个条目的 `url` 不带前导斜杠，首页的 `url` 是空字符串。

## 透传 sitemap 库选项 {#library-options}

`sitemap` 中除 `lastUpdated` 与 `transformItems` 外的所有选项，都会原样传给 [sitemap](https://github.com/ekalinin/sitemap.js) 库的 `SitemapStream`。例如：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  sitemap: {
    hostname: 'https://example.com',
    lastmodDateOnly: true,
  },
})
```

`hostname` 始终使用插件解析后的地址，即包含 `base` 的完整地址。

## 独立使用插件 {#use-the-plugin-independently}

没有使用 nagi 的站点，可以直接安装并配置同一个插件：

::: code-group
```sh [npm]
npm install --save-dev @kawapress/plugin-sitemap
```

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-sitemap
```

```sh [Yarn]
yarn add --dev @kawapress/plugin-sitemap
```
:::

```ts
import sitemapPlugin from '@kawapress/plugin-sitemap'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    sitemapPlugin({
      hostname: 'https://example.com',
    }),
  ],
})
```

## 注意事项 {#limitations}

- 单个 `sitemap.xml` 最多包含 50,000 个条目。超过时构建报错。插件不支持 sitemap index。
- 插件不生成 `robots.txt`。如需声明站点地图，请自行在 `public/robots.txt` 中写入：

```text
Sitemap: https://example.com/handbook/sitemap.xml
```

- `public/sitemap.xml` 会在生成之前复制到输出目录。它与生成的文件同名时，构建会报错，不会覆盖。请删除该文件，或改用 `transformItems` 调整内容。
