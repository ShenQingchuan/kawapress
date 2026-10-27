---
title: 官方插件总览
description: KawaPress 官方插件一览：哪些已经包含在默认的 nagi 里，哪些需要自己安装，以及各自的作用。
---

# 官方插件总览

KawaPress 的功能分成很多个小插件，每个插件只做一件事。你可以只装需要的，也可以整套交给默认的 nagi 预设。

插件分两类：

- **nagi 已内置**：用 `kawapress/nagi` 创建站点就自带，不用再安装，也不用写进 `plugins`。
- **需要自己安装**：先 `npm install` 对应的包，再写进 `plugins`。

## nagi 已内置 {#included-in-nagi}

| 插件 | 作用 |
| --- | --- |
| `@kawapress/plugin-shiki` | 代码高亮，支持明暗两套配色、行高亮、diff 标记，以及可选的 Twoslash 类型提示。 |
| `@kawapress/plugin-code-block` | 给代码块加上语言标签、复制按钮和可选的行号。 |
| `@kawapress/plugin-code-group` | 把几个代码块合成带标签页的一组，常用来并排展示 npm、pnpm、Yarn 的命令。 |
| `@kawapress/plugin-container` | 提示容器：`info`、`tip`、`warning`、`danger` 和可折叠的 `details`。 |
| `@kawapress/plugin-github-alerts` | GitHub 风格的提示块，写法是 `> [!NOTE]`。 |
| `@kawapress/plugin-search` | 本地全文搜索，首次打开搜索时才加载索引，不占首屏。 |
| `@kawapress/plugin-llms` | 为每个页面生成 `.md`，并输出 `llms.txt` 和 `llms-full.txt`，同时提供标题下的「复制页面」按钮。详见[面向 AI 的文档](/guide/ai-ready-documentation)。 |
| `@kawapress/plugin-unocss` | 接入 UnoCSS，可以在 Markdown 里直接写工具类。 |
| `@kawapress/plugin-sitemap` | 生成 `sitemap.xml`，默认关闭，设置站点地址后才启用。详见[站点地图](/plugins/sitemap)。 |

## 需要自己安装 {#install-yourself}

| 插件 | 作用 |
| --- | --- |
| [`@kawapress/plugin-mermaid`](/plugins/mermaid) | 用文字画流程图、时序图等，支持缩放，并可在图像、代码和并排三种视图间切换。 |
| [`@kawapress/plugin-image-zoom`](/plugins/image-zoom) | 点击正文图片放大查看。 |
| [`@kawapress/plugin-last-updated`](/plugins/last-updated) | 在页面底部显示「最后更新于」和「编辑此页」。 |
| [`@kawapress/plugin-comments`](/plugins/comments) | 用 GitHub Discussions 给每篇文档开一个评论区。 |
| `@kawapress/plugin-mathjax` | 在构建时把 `$…$` 和 `$$…$$` 渲染成数学公式。用法见 [Markdown 语法扩展](/guide/markdown-extensions)。 |

## 怎么安装 {#how-to-install}

需要自己安装的插件，写法都一样。以 Mermaid 为例：

::: code-group
```sh [npm]
npm install --save-dev @kawapress/plugin-mermaid
```

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-mermaid
```

```sh [Yarn]
yarn add --dev @kawapress/plugin-mermaid
```
:::

```ts
import mermaidPlugin from '@kawapress/plugin-mermaid'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    mermaidPlugin(),
  ],
})
```

你写进 `plugins` 的插件会排在 nagi 内置插件之后，所以可以覆盖它们的行为。KawaPress 会自动加载同一个包里的运行时代码，不需要再单独导入。

## 想自己写一个 {#write-your-own}

官方插件和你自己写的插件用的是同一套公开接口，没有任何内部特权。想知道插件是怎么组织的，先读[插件体系](/plugins/plugin-system)；想动手写，读[插件开发](/plugins/plugin-development)。
