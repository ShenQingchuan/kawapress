---
title: 面向 AI 的文档
description: 为每个页面生成 Markdown，并用 llms.txt 帮助 AI 工具发现和读取整套文档。
---

# 面向 AI 的文档

读者不仅会在浏览器里阅读文档，也会把文档交给编程助手、知识库和其他 AI 工具使用。

KawaPress 会在生成网页的同时，准备一套更适合这些工具读取的 Markdown 文件。使用默认预设 nagi 时，这项能力已经启用，不需要额外安装或配置。

## 复制当前页面

每个普通文档页的一级标题下方都有一个 Markdown 操作按钮。

点击主按钮会读取并复制当前页面的 Markdown。点击旁边的箭头，还可以复制这个 Markdown 文件的完整链接。

复制链接时，域名来自读者正在访问的网站，部署路径来自站点的 `base`。例如，读者打开：

```text
https://docs.example.com/kawapress/guide/start
```

复制到的 Markdown 链接会是：

```text
https://docs.example.com/kawapress/guide/start.md
```

页面正文按需读取，不会被打包进浏览器的 JavaScript。

## 生成的文件

运行 `kawapress build` 后，每个页面都会有一个对应的 `.md` 文件。

| 页面 | Markdown 文件 |
| --- | --- |
| `/` | `/index.md` |
| `/guide/start` | `/guide/start.md` |
| `/en` | `/en/index.md` |
| `/en/guide/start` | `/en/guide/start.md` |

开发服务器也会提供相同的地址。你可以在编写文档时打开这些链接，查看 AI 工具最终会读到什么。

## `llms.txt` 与 `llms-full.txt`

KawaPress 还会为每种语言生成两个入口文件。

- `llms.txt` 是简洁的文档索引，包含页面标题、Markdown 链接和页面简介。
- `llms-full.txt` 把这一语言下的全部页面合并在一起，适合需要一次读取完整文档的工具。

默认语言的文件位于：

```text
/llms.txt
/llms-full.txt
```

其他语言放在各自的目录中，例如：

```text
/en/llms.txt
/en/llms-full.txt
```

不同语言的索引只包含自己的页面，不会把多种语言混在一起。

## 独立使用插件

nagi 已经组合了这项能力。没有使用 nagi 的站点，可以独立安装并配置同一个插件：

::: code-group
```sh [npm]
npm install --save-dev @kawapress/plugin-llms
```

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-llms
```

```sh [Yarn]
yarn add --dev @kawapress/plugin-llms
```
:::

```ts
import llmsPlugin from '@kawapress/plugin-llms'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    llmsPlugin(),
  ],
})
```

Generator Plugin 负责生成 Markdown 文件，配套的 Runtime Plugin 会自动加入复制界面和样式，不需要再手动导入运行入口。

## 设置站点简介

可以通过 nagi 的 `llms.description` 为索引补充站点简介。多语言站点可以分别设置：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  llms: {
    description: {
      root: 'KawaPress 中文文档。',
      en: 'KawaPress English documentation.',
    },
  },
})
```

如果需要完全控制 `llms.txt`，可以使用 `llmsTxt()`：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  llms: {
    llmsTxt({ defaultContent, locale }) {
      return `${defaultContent}\n<!-- locale: ${locale} -->`
    },
  },
})
```

回调会为每种语言执行一次。`defaultContent` 是 KawaPress 已经生成好的默认索引，可以直接返回，也可以在它的基础上补充内容。

## 设置页面简介

页面的 `description` 会成为 `llms.txt` 中的简介：

```md
---
description: 从安装依赖开始，创建第一个 KawaPress 站点。
---

# 快速开始
```

如果希望网页简介和 AI 索引简介使用不同文字，可以单独设置 `llmsTxt`：

```md
---
description: 创建并运行第一个站点。
llmsTxt: 安装 KawaPress、启动开发服务器并生成静态文件。
---

# 快速开始
```

不希望某个页面进入 Markdown 产物和索引时，可以使用：

```md
---
llms: false
---
```

这适合只用于网站交互、对独立阅读没有帮助的页面。

## Vue 内容也会参与生成

Markdown 中的 Vue 插值、组件和 `<script setup>` 会在专用的服务端环境中运行。普通 Markdown 保留原来的源码形状，动态 Vue 内容则使用渲染后的结果。

例如：

```md
<script setup lang="ts">
const total = 2 + 2
</script>

# 计算结果

最终结果是 **{{ total }}**。
```

生成的 Markdown 会包含：

```md
# 计算结果

最终结果是 **4**。
```

根级 `<script>`、`<script setup>` 和 `<style>` 仍会帮助页面完成渲染，但不会出现在最终正文中。

::: warning 自动转换可能存在局限
KawaPress 只能读取组件在服务端渲染出的内容，无法猜出交互背后的含义。只在浏览器中出现、绘制在 Canvas 上，或需要用户操作后才显示的内容，不会自动变成完整的 Markdown。

遇到选项卡、图表和交互式演示时，请直接打开对应的 `.md` 文件检查结果。如果自动结果不适合独立阅读，请参考下面的示例使用 `SsgMarkdown` 明确提供内容。组件本身也应遵守 [SSR 兼容性](/guide/ssr-compatibility)。
:::

## 为复杂组件提供 Markdown

选项卡、图表和交互式演示有时拥有比视觉结构更合适的文字表达。组件可以使用 `SsgMarkdown` 明确提供这份内容。

先把插件加入项目的直接开发依赖：

::: code-group
```sh [npm]
npm install --save-dev @kawapress/plugin-llms
```

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-llms
```

```sh [Yarn]
yarn add --dev @kawapress/plugin-llms
```
:::

然后在组件中分别提供网页与 Markdown 内容：

```vue
<script setup lang="ts">
import { SsgMarkdown } from '@kawapress/plugin-llms/client'

const isSsgMarkdown = import.meta.env.SSG_MD
const markdown = `## 安装命令

- npm：\`npm install --save-dev kawapress\`
- pnpm：\`pnpm add --save-dev kawapress\`
- Yarn：\`yarn add --dev kawapress\``
</script>

<template>
  <SsgMarkdown v-if="isSsgMarkdown" :content="markdown" />

  <CommandTabs v-else>
    <CommandTab name="npm" command="npm install --save-dev kawapress" />
    <CommandTab name="pnpm" command="pnpm add --save-dev kawapress" />
    <CommandTab name="Yarn" command="yarn add --dev kawapress" />
  </CommandTabs>
</template>
```

浏览器继续显示交互式选项卡，生成的 `.md` 则得到简洁、完整的安装命令。这样，同一个组件可以同时为人类读者和 AI 工具提供合适的表达。
