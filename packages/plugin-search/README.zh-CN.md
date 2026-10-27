# @kawapress/plugin-search

KawaPress 的本地全文搜索。搜索第一次被打开时才加载索引。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-search?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-search) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-search/README.md)

`@kawapress/plugin-search` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 完全在浏览器里运行，不需要另外托管搜索服务。
- 索引是单独的文件，第一次使用才加载，不会拖慢首屏。
- 多语言站点只显示当前语言的结果。
- 能读懂提示容器和 GitHub 提示块，标题 ID 与页面保持一致。
- 页面可以在 frontmatter 里写 `search: false` 退出搜索。

## 安装

这个包已经包含在 `kawapress` 里。使用 `kawapress/nagi` 的站点自带它，不需要再安装。

只有不使用 nagi 预设搭建站点时，才需要单独安装它。

```sh
npm install --save-dev @kawapress/plugin-search
```

也可以用 `pnpm add --save-dev @kawapress/plugin-search` 或 `yarn add --dev @kawapress/plugin-search`。

## 使用

```ts
import searchPlugin from '@kawapress/plugin-search'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    searchPlugin({ containers: true, githubAlerts: true }),
  ],
})
```

不想让某个页面出现在结果里：

```md
---
search: false
---
```

## 文档

[文档](https://kawapress.dev/guide/frontmatter#exclude-a-page-from-search) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
