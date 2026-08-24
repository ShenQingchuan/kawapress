---
description: Install KawaPress and create, run, and build your first documentation site.
---

# Getting Started

This guide creates a small but complete KawaPress site from an empty directory. By the end, you will have Markdown pages, a default documentation interface, a local development server, and static files ready to deploy.

## Prerequisites

You need:

- [Node.js](https://nodejs.org/) 22.12 or later;
- npm, pnpm, or Yarn;
- an editor with Markdown support.

Whenever a package manager command appears, use the code group to choose npm, pnpm, or Yarn.

## Create a Project

Create a directory and initialize its `package.json`:

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

KawaPress treats the current working directory as the site root. Site configuration, Markdown pages, and build output are all resolved from this directory.

## Install KawaPress

A site using the built-in nagi (凪) preset only needs KawaPress:

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

KawaPress includes the default nagi preset and the Vue runtime it needs. A Markdown-only site does not need to install them again. Install `vue` as a direct project dependency only when your Markdown, config extensions, or custom theme imports Vue APIs or defines Vue components.

KawaPress is only required while developing and building the site. The deployed output does not require a Node.js server.

## Add Project Scripts

Add these commands to the `scripts` field in `package.json`:

```json
{
  "scripts": {
    "docs:dev": "kawapress dev",
    "docs:build": "kawapress build",
    "docs:preview": "kawapress preview"
  }
}
```

- `docs:dev` starts the development server.
- `docs:build` generates the static site.
- `docs:preview` serves the production build locally.

## Configure the Site

Create `kawapress.config.ts` in the project root:

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'My Docs',
})
```

The `nagi()` preset installs the default documentation interface and its plugins. Its styles are included automatically, so the site does not need a separate theme CSS import.

## Add Your First Pages

Create `index.md` in the project root:

```md
---
layout: home
title: My Docs
---

# My Docs

Welcome to my first KawaPress site.

[Start reading](/guide/hello)
```

Then create `guide/hello.md`:

```md
# Hello, KawaPress!

This is my first documentation page.
```

The project should now contain:

```text
my-kawapress-site/
├─ guide/
│  └─ hello.md
├─ index.md
├─ kawapress.config.ts
└─ package.json
```

Markdown file paths become public routes:

- `index.md` maps to `/`.
- `guide/hello.md` maps to `/guide/hello`.

The home page explicitly selects `layout: home`. Other Markdown pages use the `doc` layout by default, which includes the Sidebar and page outline.

## Start the Development Server

Run:

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

The site is now available at `http://localhost:5173`. Open it in a browser and follow the link from the home page to the guide.

Markdown changes are applied through HMR. Initial requests still run through real server-side rendering, so development and production builds share the same SSR semantics.

## Build and Preview

Generate the static site:

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

KawaPress writes the deployable output to `dist`. Preview that output locally with:

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

The preview server runs at `http://localhost:4173` by default. After checking the result, deploy the `dist` directory to any static hosting service.

## You Are Ready

You now have a complete KawaPress site that:

- uses Markdown for pages;
- uses nagi for its documentation interface;
- provides HMR and real SSR during development;
- builds static files that do not require a Node.js server.

You can keep adding Markdown pages or move on to routing, Markdown extensions, multilingual sites, plugins, and themes. Each of those features builds on the same project structure.
