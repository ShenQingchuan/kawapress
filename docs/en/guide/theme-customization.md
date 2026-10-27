---
title: Theme Customization
description: Learn the architectural role, component contract, and configuration boundaries of a KawaPress theme.
---

# Theme Customization

A KawaPress theme is more than a color palette and font stack. It decides where page content appears and how navigation, sidebars, footers, and not-found pages form a complete interface.

KawaPress does not provide that interface itself. It creates the Vue App, the client router and the Markdown pages, then lets the theme display them.

## A Theme Is a Regular Plugin {#a-theme-is-a-regular-plugin}

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

## KawaPress Requires Two Components {#kawapress-requires-two-components}

Every theme registers two global components:

| Component | Purpose |
| --- | --- |
| `Layout` | The page frame shared by every route. |
| `NotFound` | Content displayed when no page matches the current URL. |

The component names must match exactly. KawaPress does not require any other component structure.

Navigation bars, sidebars, page outlines, footers, and home components belong to the theme. Names such as `NavBar` and `Sidebar` inside nagi are not general KawaPress extension points, and a custom theme does not need to copy them.

### `Layout` Places the Current Page {#layout-places-the-current-page}

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

### `NotFound` Handles Unmatched Routes {#notfound-handles-unmatched-routes}

When no page matches the current path, `RouterView` displays the global `NotFound` component:

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

## Outlets Connect Plugin Interfaces to the Theme {#outlets}

A plugin should not know which theme draws the page, and a theme should not know which plugins exist. Outlets are the meeting point: a plugin puts a small piece of interface into an outlet, and the theme decides where that outlet appears.

KawaPress provides the `KawaOutlet` component and registers it globally, so a theme template can use the name directly:

```vue
<script setup lang="ts">
import { RouterView } from 'kawapress/client'
</script>

<template>
  <div class="my-theme">
    <header>
      <span>My Docs</span>
      <KawaOutlet name="header.actions" />
    </header>
    <main>
      <RouterView />
      <KawaOutlet name="doc.after" />
    </main>
    <footer>
      <KawaOutlet name="doc.footer" />
    </footer>
  </div>
</template>
```

By default an outlet renders the registered components in order and adds no wrapper element of its own. When the theme needs to filter, reorder, or wrap them, use the scoped slot:

```vue
<script setup lang="ts">
import { KawaOutlet } from 'kawapress/client'
</script>

<template>
  <KawaOutlet v-slot="{ items }" name="header.actions">
    <div class="my-theme-actions">
      <component :is="item.component" v-for="item in items" :key="item.id" />
    </div>
  </KawaOutlet>
</template>
```

Every item has three fields: `id` is the full identifier `plugin-name:plugin-local-id`, `owner` is the plugin name, and `component` is the component the plugin registered. Filter on `owner` or `id` to show only part of them.

The first release has four outlets:

| Outlet | Rendered by | Typical content |
| --- | --- | --- |
| `header.actions` | Theme | Search trigger, repository link, top-bar actions |
| `doc.header` | KawaPress | Copy-page button, page tools |
| `doc.footer` | Theme | Last updated date, edit-this-page link |
| `doc.after` | Theme | Comments, feedback form |

KawaPress places `doc.header` right after the first H1 of the Markdown body, so the theme never writes it. Pages without an H1 get no such spot.

Rendering an outlet is how a theme declares support for it; no extra declaration is needed. Two diagnostics keep that honest: rendering the same outlet twice on one page prints a single development warning, and on `kawapress build`, a plugin that placed items in an outlet no page ever rendered gets one warning line naming that plugin.

## A Minimal Theme Package {#a-minimal-theme-package}

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

If you want to see all of this in real files, the repository ships a tested reference theme: [`e2e/fixtures/reference-theme`](https://github.com/ShenQingchuan/kawapress/tree/main/e2e/fixtures/reference-theme). It renders all four outlets and runs every official UI plugin under them, and the end-to-end suite keeps it working — a useful page to open whenever a plugin does not show up where you expected.

## The Theme Defines `themeConfig` {#the-theme-defines-themeconfig}

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

## Each Language Can Override Theme Configuration {#each-language-can-override-theme-configuration}

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

## Page Presentation Rules Belong to the Theme {#page-presentation-rules-belong-to-the-theme}

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

## Themes Use the Public Client API {#themes-use-the-public-client-api}

Theme components import public capabilities from `kawapress/client`:

| API | Available data or behavior |
| --- | --- |
| `usePageData()` | Current page path, title, Frontmatter, and heading outline. |
| `useSite()` | Site title, `base`, `lang`, `dir`, and home link for the current language. |
| `useThemeConfig()` | Theme configuration merged for the current language. |
| `useLocale()` | Current locale, locale list, and matching page links. |
| `useRoute()` | The current route: `path`, `fullPath`, `query`, `hash` and whether a page matched. |
| `useRouter()` | The client router: `push()`, `replace()`, `beforeEach()` and `afterEach()`. |
| `RouterLink`, `RouterView` | Internal navigation and current route content. |
| `KawaOutlet` | Interface pieces plugins placed in one outlet. |
| `withBase()` | Deployment base for dynamic public asset URLs. |

A theme does not import internal KawaPress files or maintain another router or locale state. Server rendering, hydration, and client navigation then use the same data.

### List Pages for Navigation {#list-pages-for-navigation}

`usePageData()` returns the current page only, and `kawapress/client` has no "list every page" API: the page table carries loaders alone, while titles and layouts belong to the theme.

nagi shows how to do it: its Generator Plugin walks the Markdown sources once, reads the title and `layout` each author wrote with `createPageSummaryReader()` (no page is rendered and no `pageData()` handler runs), and hands the result to the client through a virtual module of its own. Routes a hand-written sidebar already covers are left out, so a site like this documentation, which configures every sidebar by hand, does not compute the list at all.

To build your own, publish a virtual module that holds plain JSON through a Generator Plugin's `vite()`, the same way. Do not read source files in the browser or derive a file name from a route.

## Import Theme Styles from the Runtime Plugin {#import-theme-styles-from-the-runtime-plugin}

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

## Shared Tokens and CSS Layers {#shared-tokens-and-css-layers}

Themes and plugins both need colors, fonts, and corner radii. KawaPress names these values, ships defaults for them, and lets the theme override only the values. Every page starts its `<head>` with two inline blocks, identical in development and in the build output:

```html
<style id="kawa-layers">@layer kawa.base, kawa.plugin, kawa.theme;</style>
<style id="kawa-tokens">@layer kawa.base { :root { --kawa-c-bg: light-dark(#ffffff, #1b1b1f); /* … */ } }</style>
```

The three layers, from lowest to highest priority:

| Layer | Content |
| --- | --- |
| `kawa.base` | KawaPress default tokens and a theme's global reset |
| `kawa.plugin` | Default styles shipped by plugins |
| `kawa.theme` | All theme styles |
| Styles outside any layer | CSS written by the site author, always the strongest |

Theme styles therefore always beat plugin styles, no matter in which order stylesheets load. A site author can restyle a theme with plain CSS and does not need `!important`.

The official content plugins — code blocks, code groups, custom containers, GitHub alerts, math — each ship their own default styles in the `kawa.plugin` layer and read only the shared tokens. They work in a site with no theme at all, and a theme normally only adjusts spacing, corners, or colors in `kawa.theme` instead of redrawing the plugin from scratch.

One thing to watch: a layer outranks selector specificity, so a theme's global reset (`margin: 0`, `padding: 0`, `border: 0`) must not live in `kawa.theme`, or it wipes the plugin padding too. Keep the reset in its own file and import it into `kawa.base`:

```css
/* theme.css */
@import './styles/preflight.css' layer(kawa.base);
@import './styles/theme.css';
```

The reset still reaches the whole page, yet plugin styles win over it, so plugins never have to fight the theme's normalization.

The default tokens use `light-dark()`, and `color-scheme: light dark` is declared inside the `kawa.base` layer, so a site still has usable light and dark surfaces without a theme:

| Token | Purpose |
| --- | --- |
| `--kawa-c-bg` | Page background |
| `--kawa-c-bg-soft` | Subtle surface: code blocks, hover states |
| `--kawa-c-bg-elv` | Elevated surface: dialogs, popovers |
| `--kawa-c-border` | Control borders |
| `--kawa-c-divider` | Separators |
| `--kawa-c-text-1` | Primary text |
| `--kawa-c-text-2` | Secondary text |
| `--kawa-c-text-3` | Tertiary and placeholder text |
| `--kawa-c-brand` | Accent, links, focus rings |
| `--kawa-c-info` / `--kawa-c-success` / `--kawa-c-warning` / `--kawa-c-danger` | Four status colors |
| `--kawa-font-sans` / `--kawa-font-mono` | Body font, monospace font |
| `--kawa-radius` | Default control radius |
| `--kawa-shadow-overlay` | Shadow for floating surfaces |

To restyle a token, redeclare it; there is no need to copy plugin styles:

```css
@layer kawa.theme {
  :root {
    --kawa-c-brand: light-dark(#b3005c, #ff8ab8);
    --kawa-radius: 10px;
  }
}
```

Put theme styles inside the `kawa.theme` layer so the competition between theme and plugin styles stays obvious. Third-party CSS must name a layer too, otherwise it lands outside every layer and overrides the theme:

```css
@import url('overlayscrollbars/styles/overlayscrollbars.css') layer(kawa.theme);
```

A missing `layer()` on an imported stylesheet is the most common priority accident in a theme. Check it before adding any third-party CSS.
