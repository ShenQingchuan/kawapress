---
title: Theme Development
description: Learn the KawaPress theme architecture, socket-and-plug model, required components, and configuration extension.
---

# Theme Development

In KawaPress, themes determine the structural skeleton of the page: where the top navigation bar sits, where document content is rendered, how sidebars behave, and how 404 pages look.

Unlike other static site generators, KawaPress follows two primary architectural principles:
1. **A Theme is also a Plugin**: There is no separate "theme loader". Themes are packaged, distributed, and installed just like regular plugins.
2. **Socket-and-Plug Model (Outlet System)**: Themes draw the structural frame and wrap pieces of it in outlets (`<KawaOutlet>`), while plugins add self-contained UI components before or after them. Themes and plugins remain completely decoupled.

## Page Skeleton & Outlet Layout {#page-frame-and-outlets}

A typical KawaPress documentation page is composed of theme layout components, the core content area, and eight standard outlets.

### Naming Rule {#outlet-naming}

An outlet name is a scope plus a position. It never says what goes inside:

- `layout` is the whole page frame, `doc` is the document being read.
- `start` and `end` follow the reading direction: in English and Chinese the start is on the left, in Arabic it is on the right and mirrors on its own. That is why names do not use `left` or `right`.
- Names describe a role, not a pixel position: the navigation tree is `sidebar`, not `left`.

### The Eight Standard Outlets {#standard-outlets}

Each outlet wraps a piece of content the theme draws. The theme puts that content inside `<KawaOutlet>`, and plugins can add UI before or after it.

| Outlet | Wrapped content (nagi theme) | Placed by | Typical contributions |
| :--- | :--- | :--- | :--- |
| `layout.header` | The whole top bar | Theme | Prepend: announcement banner |
| `layout.header.start` | Logo and site title | Theme | Append: version picker |
| `layout.header.end` | Language menu, appearance switch, GitHub link | Theme | Prepend: search trigger |
| `layout.sidebar` | Navigation tree | Theme | Prepend: site switcher, append: sponsor link |
| `layout.footer` | Copyright text | Theme | Append: legal notice |
| `doc` | Document body and prev/next links | Theme | Append: last updated, comments |
| `doc.under-title` | Empty, right after the first `<h1>` | **KawaPress automatically** | Copy page button, reading time |
| `doc.toc` | Document outline | Theme | Append: back to top |

> **Note**: Except for `doc.under-title`, which KawaPress injects when compiling Markdown, the other seven outlets are placed by the theme in its Vue templates. A theme does not have to implement all eight. Items added to an outlet the theme never renders are not shown, and `kawapress build` prints one warning line for them.

## How Themes & Plugins Decouple {#how-they-collaborate}

Themes and plugins never directly import each other. The collaboration flow is straightforward:

1. **User declares plugins**: Both the theme and feature plugins (like search or comments) are listed in `kawapress.config.ts`.
2. **Theme wraps content in outlets**: The theme's `Layout.vue` puts its own components inside `<KawaOutlet name="...">`. That content is the default content of the outlet.
3. **Plugins choose before or after**: In `runtime-plugin.ts`, a plugin calls `api.prependToOutlet()` to add a component before the default content, or `api.appendToOutlet()` to add one after it.
4. **Core handles distribution**: When several plugins use the same outlet, they follow the order of the `plugins` array.

The final order is: prepended plugin content, the theme's default content, appended plugin content.

### Responsibility Boundaries {#responsibilities}

| Role | What it must do | What it must never do |
| :--- | :--- | :--- |
| **Theme** | <ul><li>Provide global `Layout.vue` and `NotFound.vue`</li><li>Wrap the content it draws in `<KawaOutlet>`</li><li>Define design tokens (CSS variables via `--kawa-*`)</li></ul> | <ul><li>Hardcode business logic (e.g. search dialogs or comment systems)</li><li>Invade Markdown compilation</li></ul> |
| **Plugin** | <ul><li>Implement self-contained logic and UI components</li><li>Add components with `api.prependToOutlet()` or `api.appendToOutlet()`</li><li>Scope default styles in `@layer kawa.plugin` using `--kawa-*` tokens</li></ul> | <ul><li>Assume specific container widths or theme-specific DOM structure</li><li>Override theme global styles or read theme-private tokens (e.g. `--nagi-*`)</li></ul> |
| **Core** | <ul><li>Create Vue app and station client-side router</li><li>Render Markdown to `<RouterView />`</li><li>Automatically mount `doc.under-title` after the first H1</li><li>Validate outlet registrations and dispatch items in order</li></ul> | <ul><li>Hardcode topbars, sidebars, or default layouts</li><li>Take away visual layout control from the theme</li></ul> |

## Two Required Components {#kawapress-requires-two-components}

A theme must register two global components:

| Component | Purpose |
| --- | --- |
| `Layout` | Global page shell for all routes. Must include `<RouterView />` for document display. |
| `NotFound` | The view rendered when a URL does not match any known route. |

Aside from these two component names, KawaPress enforces no rules on your component hierarchy. Navbars, sidebars, and tables of contents can be organized however you see fit.

### 1. `Layout.vue` Places Content and Outlets {#layout-component}

Inside `Layout.vue`, use globally registered `<RouterView />` and `<KawaOutlet />`. Whatever you put inside `<KawaOutlet>` becomes the default content of that spot:

```vue
<!-- Layout.vue -->
<script setup lang="ts">
import { RouterView } from 'kawapress/client'
</script>

<template>
  <div class="my-theme-layout">
    <header class="navbar">
      <div class="logo">
        My Docs
      </div>
      <div class="actions">
        <KawaOutlet name="layout.header.end">
          <ThemeSwitch />
        </KawaOutlet>
      </div>
    </header>

    <main class="content">
      <KawaOutlet name="doc">
        <!-- Markdown content rendered here (Core auto-mounts doc.under-title below H1) -->
        <RouterView />
      </KawaOutlet>
    </main>
  </div>
</template>
```

`<KawaOutlet>` does not create a DOM element of its own. If you need a wrapper, put it inside or outside the outlet as you see fit.

> Render each outlet once per page. If the same name appears twice, every plugin item appears twice too, and development mode warns about it.

### 2. `NotFound.vue` Handles Missing Pages {#notfound-component}

When a route does not match any document, `RouterView` renders `NotFound`:

```vue
<!-- NotFound.vue -->
<script setup lang="ts">
import { useSite } from 'kawapress/client'

const site = useSite()
</script>

<template>
  <section class="my-theme-not-found">
    <h1>404</h1>
    <p>Page Not Found</p>
    <a :href="site.link">Back to Home</a>
  </section>
</template>
```

## Minimal Theme Package Structure {#a-minimal-theme-package}

```text
my-kawapress-theme/
├─ package.json
└─ src/
   ├─ index.ts           Default entry: Generator Plugin
   ├─ runtime-plugin.ts  Runtime entry: Runtime Plugin
   ├─ Layout.vue
   ├─ NotFound.vue
   └─ theme.css
```

### 1. `package.json`

```json
{
  "name": "@example/kawapress-theme",
  "type": "module",
  "version": "0.1.0",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./runtime-plugin": {
      "types": "./src/runtime-plugin.ts",
      "import": "./src/runtime-plugin.ts",
      "default": "./src/runtime-plugin.ts"
    }
  },
  "peerDependencies": {
    "kawapress": "^0.0.1"
  }
}
```

### 2. Generator Entry (`src/index.ts`)

```ts
// src/index.ts
import { definePlugin } from 'kawapress'

export default function myTheme() {
  return definePlugin({
    name: '@example/kawapress-theme',
    setup(api) {
      // Register build-time hooks when needed
    },
  })
}
```

### 3. Runtime Entry (`src/runtime-plugin.ts`)

```ts
// src/runtime-plugin.ts
import { defineRuntimePlugin } from 'kawapress'
import Layout from './Layout.vue'
import NotFound from './NotFound.vue'
import './theme.css'

export default defineRuntimePlugin({
  name: '@example/kawapress-theme',
  setup(api) {
    api.vueApp((app) => {
      app.component('Layout', Layout)
      app.component('NotFound', NotFound)
    })
  },
})
```

## Extending `themeConfig` {#theme-config}

Themes can extend the `ThemeConfig` interface to provide full autocompletion and type safety in `defineConfig()`:

```ts
// src/index.ts
declare module 'kawapress' {
  interface ThemeConfig {
    logo?: string
    githubUrl?: string
    sidebar?: Array<{
      text: string
      link: string
    }>
  }
}
```

In theme components, retrieve the configuration with `useThemeConfig()`:

```vue
<script setup lang="ts">
import { useThemeConfig } from 'kawapress/client'

const themeConfig = useThemeConfig()
</script>

<template>
  <img v-if="themeConfig?.logo" :src="themeConfig.logo" alt="logo">
</template>
```

## Styling Conventions {#styling}

- **Use Standard Tokens**: Consume `--kawa-*` variables (e.g. `--kawa-c-brand`, `--kawa-c-bg`, `--kawa-c-text-1`) so plugins harmonize with your theme automatically.
- **Override Plugins Effortlessly**: Plugin styles live in `@layer kawa.plugin`, so your theme styles override them naturally without `!important`.

For a tested real-world reference, explore [`e2e/fixtures/reference-theme`](https://github.com/kawapress/kawapress/tree/main/e2e/fixtures/reference-theme).
