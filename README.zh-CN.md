<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ShenQingchuan/kawapress/main/docs/public/kawapress-logo-dark.png">
    <img src="https://raw.githubusercontent.com/ShenQingchuan/kawapress/main/docs/public/kawapress-logo.png" alt="KawaPress" width="180">
  </picture>
</p>

<h1 align="center">KawaPress</h1>

<p align="center">
  <strong>以 Vue 为核心，面向文档与内容型网站的静态站点生成器。</strong>
</p>

<p align="center">
  用 Markdown 安心写作，在真实 SSR 中开发，通过公开能力自由扩展。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/kawapress"><img src="https://img.shields.io/npm/v/kawapress/beta?label=npm%20beta&color=42b883" alt="npm beta 版本"></a>
  <a href="https://github.com/ShenQingchuan/kawapress/actions/workflows/deploy-pages.yml"><img src="https://github.com/ShenQingchuan/kawapress/actions/workflows/deploy-pages.yml/badge.svg" alt="文档构建状态"></a>
  <a href="https://github.com/ShenQingchuan/kawapress/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ShenQingchuan/kawapress" alt="MIT 许可"></a>
  <img src="https://img.shields.io/badge/Node.js-%E2%89%A522.12-339933?logo=nodedotjs&logoColor=white" alt="Node.js 22.12 或更高版本">
</p>

<p align="center">
  <a href="https://shenqingchuan.github.io/kawapress/">中文文档</a>
  ·
  <a href="https://github.com/ShenQingchuan/kawapress/blob/main/README.md">English</a>
</p>

> [!IMPORTANT]
> KawaPress 目前处于 beta 阶段，适合试用和早期项目。0.1.0 之前，公开 API 仍可能调整；现阶段使用时请固定具体版本。

## 为什么选择 KawaPress？

KawaPress 会把 Markdown 编译成预渲染的 Vue 网站。它保留了文档生成器简单、轻快的写作方式，同时让官方主题和第三方扩展使用完全相同的公开能力。

- **开发时也执行真实 SSR**：每次首次请求都会在服务端渲染。只在 SSR 中出现的问题，不必等到构建或上线后才发现。
- **默认体验完整**：内置 nagi（凪）预设，包含响应式文档布局、深浅色模式、本地搜索、代码高亮、Twoslash、代码组和多语言导航等常用能力。
- **从头到尾使用 Vue**：Markdown 会变成 Vue 组件，页面跳转交给 Vue Router；需要交互时，也可以自然地使用普通 Vue SFC。
- **面向 AI 的文档产物**：nagi 默认生成每页 `.md`、各语言的 `llms.txt` 与 `llms-full.txt`，并提供复制正文和链接的操作。
- **统一的扩展模型**：Generator Plugin、Runtime Plugin 与 Preset 分别覆盖生成阶段、Vue 运行时和能力组合，不依赖主题私有入口。

KawaPress 是一个独立项目，不是 VitePress 的分支或配置兼容层，也不能直接使用 VitePress 配置。

## 快速开始

请先准备 [Node.js](https://nodejs.org/) 22.12 或更高版本。

```sh
mkdir my-kawapress-site
cd my-kawapress-site
pnpm init
pnpm add --save-dev kawapress
```

创建 `kawapress.config.ts`：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'My Docs',
})
```

创建 `index.md`：

```md
---
layout: home
title: My Docs
---

# My Docs

欢迎来到我的 KawaPress 站点。
```

启动开发服务器：

```sh
pnpm exec kawapress dev
```

构建静态文件到 `dist`：

```sh
pnpm exec kawapress build
```

部署产物是普通静态文件，不需要在服务器上继续运行 Node.js。npm 和 Yarn 的完整命令可以查看[快速开始](https://shenqingchuan.github.io/kawapress/guide/getting-started)。

> 如果站点会直接导入 Vue API 或 Vue 组件，还需要把 `vue` 安装为开发依赖。

## 默认包含什么？

| 范围 | 内置能力 |
| --- | --- |
| 内容编写 | Markdown、Frontmatter、在 Markdown 中使用 Vue、文件路由、Data Loader |
| 渲染 | 开发与构建共享 SSR 语义、Hydration、Vue Router 站内导航 |
| 文档界面 | nagi 布局、响应式 Sidebar、本页目录、深浅色模式、多语言 |
| 内容增强 | Shiki、Twoslash、代码组、代码复制、提示容器、GitHub Alerts |
| 内容发现 | 按需加载的本地搜索与多语言导航 |
| AI 读取 | 页面 `.md`、`llms.txt`、`llms-full.txt`、页面复制操作 |
| 样式 | UnoCSS 集成与 nagi 默认配置 |

`kawapress` 已经包含 nagi 和它使用的官方插件。普通文档站只需要安装这一个包；需要自行组合能力时，也可以直接使用独立的 `@kawapress/*` 包。

## 扩展模型

KawaPress 把扩展边界分得很清楚：

- **Generator Plugin** 负责配置、Markdown、页面数据、Vite 与构建产物；
- **Runtime Plugin** 在 SSR 和浏览器中扩展真实的 Vue App 与 Vue Router；
- **Preset** 把配置和一组插件组合成可以直接使用的产品体验，例如 nagi。

一个逻辑插件只需要安装一次，同时可以提供生成侧和运行侧能力。更多内容请查看[插件体系](https://shenqingchuan.github.io/kawapress/guide/plugin-system)。

## 文档

- [快速开始](https://shenqingchuan.github.io/kawapress/guide/getting-started)
- [KawaPress 是什么？](https://shenqingchuan.github.io/kawapress/guide/what-is-kawapress)
- [Markdown 语法扩展](https://shenqingchuan.github.io/kawapress/guide/markdown-extensions)
- [国际化](https://shenqingchuan.github.io/kawapress/guide/internationalization)
- [插件体系](https://shenqingchuan.github.io/kawapress/guide/plugin-system)
- [主题定制](https://shenqingchuan.github.io/kawapress/guide/theme-customization)

## 参与贡献

欢迎提交 Issue 和 Pull Request。如果准备增加较大的功能，请先创建 Issue，把目标和方案聊清楚后再开始实现。

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

KawaPress 仓库使用 Node.js 22.12 或更高版本，以及 pnpm 11.22.0 进行开发。

## 开源许可

[MIT](https://github.com/ShenQingchuan/kawapress/blob/main/LICENSE) © KawaPress 贡献者
