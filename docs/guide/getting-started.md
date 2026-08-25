---
description: 从安装依赖开始，创建并运行你的第一个 KawaPress 文档站。
---

# 快速开始

这一章会陪你从一个空文件夹开始，搭好第一个可以编写、预览和构建的 KawaPress 文档站。

完成以后，你会得到一个由 Markdown 驱动、带有默认文档界面，并且可以直接构建成静态文件的小网站。

## 开始前的准备

请先准备好：

- [Node.js](https://nodejs.org/) 22.12 或更高版本；
- npm、pnpm 或 Yarn 中任意一种包管理器；
- 一个你用得顺手的 Markdown 编辑器。

## 创建项目

先新建一个文件夹，并初始化 `package.json`：

::: code-group
```sh [npm]
mkdir my-kawapress-site
cd my-kawapress-site
npm init -y
```

```sh [pnpm]
mkdir my-kawapress-site
cd my-kawapress-site
pnpm init
```

```sh [Yarn]
mkdir my-kawapress-site
cd my-kawapress-site
yarn init -y
```
:::

KawaPress 会把运行命令时所在的目录作为站点根目录。配置、Markdown 页面和构建产物都会从这里开始组织。

## 安装 KawaPress

使用默认预设 nagi（凪）时，只需要安装 KawaPress：

::: code-group
```sh [npm]
npm install --save-dev kawapress
```

```sh [pnpm]
pnpm add --save-dev kawapress
```

```sh [Yarn]
yarn add --dev kawapress
```
:::

KawaPress 已经带上默认 nagi 及其运行所需的 Vue。只写 Markdown 时，不需要重复安装它们。只有当你要在 Markdown、配置扩展或自定义主题中直接导入 Vue API、编写 Vue 组件时，才需要把 `vue` 另行安装为项目依赖。

KawaPress 只在开发和构建时使用。部署完成后，站点不需要在服务器上继续运行 KawaPress 或 Node.js。

## 添加常用命令

打开 `package.json`，把下面三个命令加入 `scripts`：

```json
{
  "scripts": {
    "docs:dev": "kawapress dev",
    "docs:build": "kawapress build",
    "docs:preview": "kawapress preview"
  }
}
```

- `docs:dev` 启动开发服务器；
- `docs:build` 生成可部署的静态文件；
- `docs:preview` 在本地预览构建结果。

## 配置站点

在项目根目录创建 `kawapress.config.ts`：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'My Docs',
})
```

这里的 `nagi()` 会为站点准备好默认文档界面和它所需的插件。主题样式也会自动进入最终应用，不需要再手动导入 CSS。

## 使用 UnoCSS 工具类

nagi 默认启用 [UnoCSS](https://unocss.dev/)，并准备好 `presetWind4`、`presetIcons` 与 `presetWebFonts`。你可以直接在 Markdown 的 HTML 中使用 Wind4 工具类：

<div class="my-6 rounded-xl bg-slate-100 p-4 text-sm dark:bg-slate-800">
  这张提示卡的间距、圆角和背景色都由 UnoCSS 生成。
</div>

Wind4 的全局 reset 默认关闭，不会覆盖 nagi 或其他插件的基础样式。Icons 与 Web Fonts 预设也已经可用，但只有在你配置具体图标集或字体以后才会加载对应资源。

## 写下第一批页面

先在项目根目录创建 `index.md`：

```md
---
layout: home
title: My Docs
---

# My Docs

欢迎来到我的第一个 KawaPress 站点。

[开始阅读](/guide/hello)
```

接着创建 `guide/hello.md`：

```md
# 你好，KawaPress！

这是我的第一篇文档。
```

现在，项目结构应该是这样：

```text
my-kawapress-site/
├─ guide/
│  └─ hello.md
├─ index.md
├─ kawapress.config.ts
└─ package.json
```

Markdown 文件的位置会直接决定访问路径：

- `index.md` 对应 `/`；
- `guide/hello.md` 对应 `/guide/hello`。

首页显式使用了 `layout: home`。普通 Markdown 页面不需要声明布局，默认会使用带 Sidebar 和本页目录的 `doc` 布局。

## 启动开发服务器

运行：

::: code-group
```sh [npm]
npm run docs:dev
```

```sh [pnpm]
pnpm docs:dev
```

```sh [Yarn]
yarn docs:dev
```
:::

开发服务器会启动在 `http://localhost:5173`。打开这个地址，你应该已经可以看到首页，并从首页进入刚刚写好的文档。

试着修改任意一个 Markdown 文件，页面会通过 HMR 及时更新。首次访问仍会经过真实的服务端渲染，因此开发时看到的页面与最终构建使用相同的 SSR 语义。

## 构建与预览

准备发布时，先生成静态站点：

::: code-group
```sh [npm]
npm run docs:build
```

```sh [pnpm]
pnpm docs:build
```

```sh [Yarn]
yarn docs:build
```
:::

构建完成后，所有可部署文件都会放在 `dist` 目录中。你可以继续在本地检查它们：

::: code-group
```sh [npm]
npm run docs:preview
```

```sh [pnpm]
pnpm docs:preview
```

```sh [Yarn]
yarn docs:preview
```
:::

预览服务器默认运行在 `http://localhost:4173`。确认没有问题后，把 `dist` 目录交给任意静态托管服务即可。

## 万事俱备

到这里，你已经完成了一个最小但完整的 KawaPress 站点：

- 使用 Markdown 编写页面；
- 使用 nagi 提供默认文档界面；
- 在开发阶段获得 HMR 与真实 SSR；
- 构建出不依赖 Node.js 服务器的静态文件。

接下来，你可以继续添加 Markdown 页面，也可以逐步了解路由、Markdown 扩展、多语言、插件和主题。它们都会建立在刚刚完成的这个项目结构之上。
