---
title: Theme Customization
description: Learn the architectural role, component contract, and configuration boundaries of a KawaPress theme.
---

# Theme Customization

A KawaPress theme is more than a color palette and font stack. It decides where page content appears and how navigation, sidebars, footers, and not-found pages form a complete interface.

KawaPress does not provide that interface itself. It creates the Vue App, Vue Router, and Markdown pages, then lets the theme display them.

## A Theme Is a Regular Plugin

KawaPress has no separate theme loader or theme-only lifecycle. Themes use the same plugin system as search and syntax highlighting.

A theme package follows the shared [Plugin package export conventions](/en/guide/plugin-system#plugin-package-exports):

```text
@example/kawapress-theme
├─ Generator Plugin
│  └─ declares the Plugin identity and optionally participates in the build
└─ Runtime Plugin
   ├─ registers Layout and NotFound
   ├─ registers other theme components
   └─ imports theme styles
```

The site adds the Generator Plugin to its configuration, and KawaPress automatically loads the Runtime Plugin from the same package.

When a theme has no generation work, the Generator Plugin can keep an empty `setup()`. Register Hooks there only when the theme needs to scan content directories, generate navigation data, or adjust Vite. nagi, for example, reads directory metadata used by its sidebar during generation.

The Runtime Plugin is loaded during both server rendering and browser startup. Theme components and statically imported dependencies must support both environments. Follow [SSR Compatibility](/en/guide/ssr-compatibility) for browser-only code.

## KawaPress Requires Two Components

Every theme registers two global components:

| Component | Purpose |
| --- | --- |
| `Layout` | The page frame shared by every route. |
| `NotFound` | Content displayed when no page matches the current URL. |

The component names must match exactly. KawaPress does not require any other component structure.

Navigation bars, sidebars, page outlines, footers, and home components belong to the theme. Names such as `NavBar` and `Sidebar` inside nagi are not general KawaPress extension points, and a custom theme does not need to copy them.

### `Layout` Places the Current Page

The KawaPress root component renders the global `Layout`. The theme places `<RouterView />` where the current Markdown page should appear:

```vue
<script setup lang="ts">
import { RouterView } from 'kawapress/client'
</script>

<template>
  <div class="my-theme">
    <header>My Docs</header>
    <main class="my-theme-doc">
      <RouterView />
    </main>
  </div>
</template>
```

`Layout` can add any structure around `RouterView` and choose different page frames from the current page data. KawaPress does not require documentation, home, and plain pages to share one layout.

### `NotFound` Handles Unmatched Routes

When Vue Router cannot match a route, `RouterView` displays the global `NotFound` component:

```vue
<script setup lang="ts">
import { useSite } from 'kawapress/client'

const site = useSite()
</script>

<template>
  <section class="my-theme-not-found">
    <h1>404</h1>
    <p>Page not found</p>
    <a :href="site.link">Back to home</a>
  </section>
</template>
```

`NotFound` is still rendered inside `Layout`, so it keeps the theme's navigation and surrounding styles.

## A Minimal Theme Package

A theme package that KawaPress can load automatically can use this structure:

```text
my-kawapress-theme/
├─ package.json
└─ src/
   ├─ index.ts
   ├─ runtime-plugin.ts
   ├─ Layout.vue
   ├─ NotFound.vue
   └─ theme.css
```

The default entry exports a Generator Plugin. When the theme has no generation extensions, `setup()` can remain empty:

```ts
// src/index.ts
import { definePlugin } from 'kawapress'

export default function themePlugin() {
  return definePlugin({
    name: '@example/kawapress-theme',
    setup() {
      // Register build Hooks here when the theme needs them.
    },
  })
}
```

The `./runtime-plugin` entry registers theme components and imports the single theme stylesheet entry:

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

The site adds only the default Generator Plugin to `plugins` and never imports the runtime entry directly:

```ts
import themePlugin from '@example/kawapress-theme'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    themePlugin(),
  ],
})
```

A site should install only one theme responsible for `Layout` and `NotFound`. Other interface features can continue to use regular Plugins.

## The Theme Defines `themeConfig`

KawaPress does not interpret fields inside `themeConfig`. A theme defines a typed configuration for its own components and behavior:

```ts
export interface MyThemeConfig {
  logo?: string
  menuLabel?: string
  sidebar?: Array<{
    text: string
    link: string
  }>
}
```

A site passes this type to `defineConfig()` for configuration hints:

```ts
import type { MyThemeConfig } from '@example/kawapress-theme'
import themePlugin from '@example/kawapress-theme'
import { defineConfig } from 'kawapress'

export default defineConfig<MyThemeConfig>({
  themeConfig: {
    logo: '/logo.svg',
    menuLabel: 'Menu',
  },
  plugins: [
    themePlugin(),
  ],
})
```

Theme components read the current configuration with `useThemeConfig()`:

```ts
import type { MyThemeConfig } from '@example/kawapress-theme'
import { useThemeConfig } from 'kawapress/client'

const theme = useThemeConfig<MyThemeConfig>()
```

`useThemeConfig()` reacts to the current route. A theme does not need to parse the URL or maintain a second runtime configuration channel.

`themeConfig` enters server rendering and the browser, so it only contains serializable data. Do not store components, functions, Vue refs, or class instances in it.

## Each Language Can Override Theme Configuration

Top-level `themeConfig` contains settings shared by every language. A locale can replace fields that differ for that language:

```ts
import type { MyThemeConfig } from '@example/kawapress-theme'
import themePlugin from '@example/kawapress-theme'
import { defineConfig } from 'kawapress'

export default defineConfig<MyThemeConfig>({
  themeConfig: {
    logo: '/logo.svg',
    menuLabel: 'Menu',
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en',
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        menuLabel: '菜单',
      },
    },
  },
  plugins: [
    themePlugin(),
  ],
})
```

KawaPress shallowly merges the two configurations. The Chinese page above keeps the top-level `logo` and replaces `menuLabel` with “菜单”.

A shallow merge does not continue into nested objects. If a locale provides `labels`, it replaces the entire `labels` field. Themes can prefer flatter configuration or restore defaults in their own resolver.

## Page Presentation Rules Belong to the Theme

Frontmatter is preserved in page data, so a theme can define page-level fields for its own interface:

```ts
import { usePageData } from 'kawapress/client'
import { computed } from 'vue'

const page = usePageData()
const layout = computed(() =>
  page.value?.frontmatter.layout ?? 'doc',
)
```

nagi interprets fields such as `layout`, `hero`, `features`, `sidebar`, and `outline`. These are nagi conventions, not fields that every KawaPress theme must support.

A custom theme can define different layout names and page options. It should publish types and documentation for those fields. Frontmatter still contains serializable data only.

## Themes Use the Public Client API

Theme components import public capabilities from `kawapress/client`:

| API | Available data or behavior |
| --- | --- |
| `usePageData()` | Current page path, title, Frontmatter, and heading outline. |
| `useSite()` | Site title, `base`, `lang`, `dir`, and home link for the current language. |
| `useThemeConfig()` | Theme configuration merged for the current language. |
| `useLocale()` | Current locale, locale list, and matching page links. |
| `useRouter()` | The Vue Router instance used by KawaPress. |
| `RouterLink`, `RouterView` | Internal navigation and current route content. |
| `withBase()` | Deployment base for dynamic public asset URLs. |

A theme does not import internal KawaPress files or maintain another router or locale state. Server rendering, hydration, and client navigation then use the same data.

## Import Theme Styles from the Runtime Plugin

The theme Runtime Plugin imports CSS directly. KawaPress includes it in both server and browser builds, so the site does not import theme styles separately.

Keep one theme CSS entry and let it organize variables, foundations, layout, content typography, and responsive rules:

```css
/* theme.css */
@import './styles/vars.css';
@import './styles/base.css';
@import './styles/layout.css';
@import './styles/content.css';
```

Use a theme-specific class prefix and limit Markdown typography to a clear content container. Broad global selectors should not unexpectedly change Vue components embedded in Markdown.

Dark mode, responsive layout, and interaction styling also belong to the theme. KawaPress supplies page and locale data but does not choose these interface behaviors.
