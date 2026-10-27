# @kawapress/plugin-container

Markdown 的提示容器：info、tip、warning、danger，以及可折叠的 details。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-container?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-container) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-container/README.md)

`@kawapress/plugin-container` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 五种类型：`info`、`tip`、`warning`、`danger`，以及可折叠的 `details`。
- 类型后面可以写自定义标题，标题里能用行内 Markdown。
- 默认标题跟着页面语言走，内置中文和英文。

## 安装

这个包已经包含在 `kawapress` 里。使用 `kawapress/nagi` 的站点自带它，不需要再安装。

只有不使用 nagi 预设搭建站点时，才需要单独安装它。

```sh
npm install --save-dev @kawapress/plugin-container
```

也可以用 `pnpm add --save-dev @kawapress/plugin-container` 或 `yarn add --dev @kawapress/plugin-container`。

## 使用

````md
::: tip
在本地做一次生产构建，能更早发现部署问题。
:::

::: danger **先停下来检查配置**
不要把访问令牌提交到 Git 仓库。
:::
````

```ts
import containerPlugin from '@kawapress/plugin-container'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [containerPlugin()],
})
```

## 配置项

| 选项 | 说明 |
| --- | --- |
| `labels` | 改写所有语言的默认标题。 |
| `localeLabels` | 改写某一种语言的默认标题，键是 `locales` 里的名字。 |

## 文档

[文档](https://kawapress.dev/guide/markdown-extensions) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
