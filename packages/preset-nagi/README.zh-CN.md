# @kawapress/preset-nagi

nagi（凪），KawaPress 默认的文档预设。

[![npm version](https://img.shields.io/npm/v/@kawapress/preset-nagi?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/preset-nagi) · [English](https://github.com/kawapress/kawapress/blob/main/packages/preset-nagi/README.md)

`@kawapress/preset-nagi` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 自适应的文档布局，带侧边栏、页面大纲和顶部导航栏。
- 浅色和深色外观，多语言站点还有语言切换。
- `home` 布局用于首页，`page` 布局用于普通内容页。
- 带上代码、容器、搜索、AI 输出、站点地图和 UnoCSS 这些官方插件。

## 安装

这个包已经包含在 `kawapress` 里。使用 `kawapress/nagi` 的站点自带它，不需要再安装。

只有不使用 nagi 预设搭建站点时，才需要单独安装它。

```sh
npm install --save-dev @kawapress/preset-nagi
```

也可以用 `pnpm add --save-dev @kawapress/preset-nagi` 或 `yarn add --dev @kawapress/preset-nagi`。

## 使用

从 `kawapress/nagi` 引入，把站点配置传进去：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: '我的文档',
  themeConfig: {
    nav: [{ text: '指南', link: '/guide/getting-started' }],
  },
})
```

写进 `plugins` 的插件在 nagi 自带的插件之后运行，所以可以覆盖它们。

## 文档

[文档](https://kawapress.dev/guide/what-is-kawapress) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
