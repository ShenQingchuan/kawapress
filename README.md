<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ShenQingchuan/kawapress/main/docs/public/kawapress-logo-dark.png">
    <img src="https://raw.githubusercontent.com/ShenQingchuan/kawapress/main/docs/public/kawapress-logo.png" alt="KawaPress" width="180">
  </picture>
</p>

<h1 align="center">KawaPress</h1>

<p align="center">
  <strong>A Vue-first static site generator for documentation and content-focused websites.</strong>
</p>

<p align="center">
  Write in Markdown. Develop with real SSR. Extend everything through public APIs.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/kawapress"><img src="https://img.shields.io/npm/v/kawapress/beta?label=npm%20beta&color=42b883" alt="npm beta version"></a>
  <a href="https://github.com/ShenQingchuan/kawapress/actions/workflows/deploy-pages.yml"><img src="https://github.com/ShenQingchuan/kawapress/actions/workflows/deploy-pages.yml/badge.svg" alt="documentation build"></a>
  <a href="https://github.com/ShenQingchuan/kawapress/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ShenQingchuan/kawapress" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/Node.js-%E2%89%A522.12-339933?logo=nodedotjs&logoColor=white" alt="Node.js 22.12 or newer">
</p>

<p align="center">
  <a href="https://shenqingchuan.github.io/kawapress/en/">Documentation</a>
  ·
  <a href="https://github.com/ShenQingchuan/kawapress/blob/main/README.zh-CN.md">简体中文</a>
</p>

> [!IMPORTANT]
> KawaPress is in beta. It is ready for testing and early projects, but APIs may change before 0.1.0. Please pin the version when adopting it today.

## Why KawaPress?

KawaPress turns Markdown into pre-rendered Vue websites. It keeps the familiar simplicity of a documentation generator while giving themes and plugins the same public extension points used by the official experience.

- **Real SSR during development** — every initial request is server-rendered, so SSR-only problems appear before build or deployment.
- **A complete default experience** — the built-in nagi (凪) preset includes responsive documentation layouts, dark mode, local search, syntax highlighting, Twoslash, code groups, multilingual navigation, and more.
- **Vue from end to end** — Markdown becomes Vue components, Vue Router handles navigation, and regular Vue SFCs fit naturally into content.
- **AI-ready output** — nagi generates page-level Markdown, locale-aware `llms.txt` and `llms-full.txt`, plus built-in copy actions.
- **One extension model** — Generator Plugins, Runtime Plugins, and Presets cover build-time behavior, the Vue runtime, themes, and reusable product setups without private theme hooks.

KawaPress is an independent project. It is not a VitePress fork or a drop-in replacement, and it intentionally does not use VitePress configuration.

## Quick Start

You need [Node.js](https://nodejs.org/) 22.12 or newer.

```sh
mkdir my-kawapress-site
cd my-kawapress-site
pnpm init
pnpm add --save-dev kawapress
```

Create `kawapress.config.ts`:

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'My Docs',
})
```

Create `index.md`:

```md
---
layout: home
title: My Docs
---

# My Docs

Welcome to my KawaPress site.
```

Start the development server:

```sh
pnpm exec kawapress dev
```

Build static files into `dist`:

```sh
pnpm exec kawapress build
```

The deployed output is static and does not require a Node.js server. npm and Yarn commands are available in the [Getting Started guide](https://shenqingchuan.github.io/kawapress/en/guide/getting-started).

> If your site directly imports Vue APIs or Vue components, also install `vue` as a development dependency.

## What You Get

| Area | Included capability |
| --- | --- |
| Authoring | Markdown, frontmatter, Vue in Markdown, file-based routing, data loaders |
| Rendering | Shared development/build SSR semantics, hydration, Vue Router navigation |
| Documentation UI | nagi layouts, responsive sidebar, page outline, dark mode, i18n |
| Content | Shiki, Twoslash, code groups, code copy, containers, GitHub alerts |
| Discovery | Lazy local search and locale-aware navigation |
| AI consumption | Page `.md`, `llms.txt`, `llms-full.txt`, copy actions |
| Styling | UnoCSS integration with sensible nagi defaults |

The `kawapress` package includes nagi and its official plugins. A basic site only needs this one package; advanced users can compose the individual `@kawapress/*` packages directly.

## Extension Model

KawaPress keeps extension boundaries explicit:

- a **Generator Plugin** extends configuration, Markdown, page data, Vite, and build artifacts;
- a **Runtime Plugin** extends the real Vue App and Vue Router in both SSR and the browser;
- a **Preset** combines configuration and plugins into a ready-to-use experience such as nagi.

A logical plugin is installed once and can provide both generator and runtime behavior. Learn more in the [Plugin System guide](https://shenqingchuan.github.io/kawapress/en/guide/plugin-system).

## Documentation

- [Getting Started](https://shenqingchuan.github.io/kawapress/en/guide/getting-started)
- [What is KawaPress?](https://shenqingchuan.github.io/kawapress/en/guide/what-is-kawapress)
- [Markdown Extensions](https://shenqingchuan.github.io/kawapress/en/guide/markdown-extensions)
- [Internationalization](https://shenqingchuan.github.io/kawapress/en/guide/internationalization)
- [Plugin System](https://shenqingchuan.github.io/kawapress/en/guide/plugin-system)
- [Theme Customization](https://shenqingchuan.github.io/kawapress/en/guide/theme-customization)

## Contributing

Issues and pull requests are welcome. For a large feature, please open an issue first so the direction can be agreed on before implementation.

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

KawaPress uses Node.js 22.12 or newer and pnpm 11.22.0 for repository development.

## License

[MIT](https://github.com/ShenQingchuan/kawapress/blob/main/LICENSE) © KawaPress contributors
