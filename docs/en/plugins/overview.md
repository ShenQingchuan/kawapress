---
title: Official Plugins
description: "The official KawaPress plugins at a glance: which ones nagi already includes, which ones you install yourself, and what each does."
---

# Official Plugins

KawaPress splits its features into small plugins, and each plugin does one thing. You can install only the ones you need, or leave the whole set to the default nagi preset.

Plugins come in two kinds:

- **Included in nagi**: a site created with `kawapress/nagi` already has them. You do not install them or add them to `plugins`.
- **Install yourself**: run `npm install` for the package first, then add it to `plugins`.

## Included in nagi {#included-in-nagi}

| Plugin | What it does |
| --- | --- |
| `@kawapress/plugin-shiki` | Code highlighting with light and dark themes, line highlights, diff marks, and optional Twoslash type hints. |
| `@kawapress/plugin-code-block` | Adds a language label, a copy button and optional line numbers to code blocks. |
| `@kawapress/plugin-code-group` | Groups several code blocks into tabs. Often used to show npm, pnpm and Yarn commands side by side. |
| `@kawapress/plugin-container` | Callout containers: `info`, `tip`, `warning`, `danger` and a collapsible `details`. |
| `@kawapress/plugin-github-alerts` | GitHub-style callouts, written as `> [!NOTE]`. |
| `@kawapress/plugin-search` | Local full-text search. The index loads only when search is first opened, so it does not slow the first paint. |
| `@kawapress/plugin-llms` | Writes a `.md` file for every page and the `llms.txt` and `llms-full.txt` files. Also adds a "copy page" button under the title. See [AI-Ready Documentation](/en/guide/ai-ready-documentation). |
| `@kawapress/plugin-unocss` | Adds UnoCSS, so you can write utility classes in Markdown. |
| `@kawapress/plugin-sitemap` | Writes `sitemap.xml`. It is off by default and turns on when you set the site address. See [Sitemap](/en/plugins/sitemap). |

## Install yourself {#install-yourself}

| Plugin | What it does |
| --- | --- |
| [`@kawapress/plugin-mermaid`](/en/plugins/mermaid) | Draw flowcharts, sequence diagrams and more from text, with zoom and a switch between diagram, code and side-by-side views. |
| [`@kawapress/plugin-image-zoom`](/en/plugins/image-zoom) | Click an image in the text to see it larger. |
| [`@kawapress/plugin-last-updated`](/en/plugins/last-updated) | Shows "Last updated" and "Edit this page" at the bottom of each page. |
| [`@kawapress/plugin-comments`](/en/plugins/comments) | Gives every page a comment section backed by GitHub Discussions. |
| `@kawapress/plugin-mathjax` | Renders `$…$` and `$$…$$` as math at build time. See [Markdown Extensions](/en/guide/markdown-extensions) for usage. |

## How to install {#how-to-install}

Plugins you install yourself all work the same way. Here is Mermaid:

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

Plugins you add to `plugins` run after the plugins nagi includes, so they can override them. KawaPress loads the runtime code from the same package by itself, so you never import it separately.

## Write your own {#write-your-own}

Official plugins and the ones you write use the same public interface, with no internal privileges. To see how plugins are organized, read [Plugin System](/en/plugins/plugin-system). To write one, read [Plugin Development](/en/plugins/plugin-development).
