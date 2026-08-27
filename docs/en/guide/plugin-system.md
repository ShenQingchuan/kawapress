---
title: Plugin System
description: Learn how KawaPress keeps code that spans generation and runtime together as one composable feature.
---

# Plugin System

Extensions for a documentation tool usually begin with a small request.

Imagine adding local search. It first needs to read every Markdown file, divide content by heading, and generate an index. So far, all of the work happens during the build.

The website then needs a search button and result list. It must respond to the keyboard, follow the current language, and ask the Router to open the selected result. The feature now reaches into Vue and the browser as well.

To a site author, this is still one feature: **search**. In many static site generators, however, its implementation has already become several pieces that must be connected separately.

The KawaPress plugin system starts with this problem.

## One Feature, Configured in Several Places

VitePress provides several useful extension points. You can adjust Markdown in configuration, add Vite Plugins, and use build Hooks. In the final website, a theme can use `enhanceApp` to install Vue plugins and components.

These entry points are useful and keep VitePress simple and flexible. But when search needs several of them, the same feature must be configured in several places, and the site author must remember how those pieces connect.

This is manageable when a feature only changes Markdown. Once it also generates data, registers components, imports styles, and handles browser interaction, the extension author must wire those pieces together. The site author may then need separate setup steps for configuration and the theme entry.

The missing piece is not another Hook. It is a way to tell the framework that all of this code belongs to one Plugin.

## The KawaPress Plugin Contract

Generating an index and displaying a search interface should happen in different places. KawaPress does not force them into one execution environment. It puts them in one plugin package:

```text
@kawapress/plugin-search
├─ Generator Plugin
│  └─ scans Markdown and generates the search index
└─ Runtime Plugin
   └─ registers search components, styles, and interaction
```

KawaPress calls the complete search feature a Plugin. That Plugin can contain two cooperating parts.

### A Generator Plugin Participates in the Build

A Generator Plugin works while KawaPress loads configuration, compiles Markdown, and builds the site. It can:

- change site configuration;
- extend Markdown syntax;
- adjust data for each page;
- install a Vite Plugin or change Vite configuration.

A custom container only changes generated HTML, so a Generator Plugin is enough. Local search generates its index here, and syntax highlighting turns source code into final markup here as well.

### A Runtime Plugin Participates in the Page Runtime

A Runtime Plugin works when KawaPress creates the Vue App and Vue Router. It can:

- install regular Vue plugins;
- register global components;
- import runtime styles;
- add navigation guards and other Router behavior.

Server rendering and the browser both load Runtime Plugins. Search interfaces, copy buttons, and theme layouts all need this part. Read [SSR Compatibility](/en/guide/ssr-compatibility) before using browser APIs.

The Generator Plugin and Runtime Plugin run at different times, but they still belong to one Plugin. A site imports and configures the feature once. KawaPress automatically finds the Runtime Plugin supplied by the same package:

```ts
import searchPlugin from '@kawapress/plugin-search'

const plugins = [
  searchPlugin(),
]
```

The site author does not register search again in a theme entry or learn how many stages the feature crosses internally. From the outside, the task is still “install search.”

## Good Defaults Should Form a Complete Product

Once search, syntax highlighting, custom containers, and themes can be installed independently, a site has more freedom. But if every site must select and connect each feature from scratch, a basic documentation site begins with a long configuration checklist.

A Preset solves this problem.

A Preset combines default configuration and an ordered set of Plugins into an experience that is ready to use:

```text
Preset
├─ default configuration
└─ an ordered set of Plugins
   ├─ theme
   ├─ Markdown features
   ├─ search
   └─ other defaults
```

nagi (凪) is the built-in KawaPress Preset. It prepares the documentation layout, syntax highlighting, custom containers, search, UnoCSS, and other features, so a site can begin with very little configuration:

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'My Docs',
})
```

There is no privileged “official theme layer” here. A Runtime Plugin installs the nagi interface, and every feature it combines is a regular Plugin. Official code uses the same public extension points available to third parties.

## Add Plugins to a Preset

Using nagi does not prevent a site from adding independent features. This configuration keeps every nagi default and adds MathJax:

```ts
import mathjaxPlugin from '@kawapress/plugin-mathjax'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    mathjaxPlugin(),
  ],
})
```

Preset Plugins are added first, followed by the entries in `plugins`. Array order is execution order. A later Plugin sees changes made earlier and can deliberately replace them.

KawaPress does not use numeric priorities or guess plugin dependencies behind the scenes. The order shown in configuration is the order in which features are combined.

A completely different interface can skip Presets and start with `defineConfig()`:

```ts
import { defineConfig } from 'kawapress'
import themePlugin from 'my-kawapress-theme'
import markdownPlugin from 'my-markdown-plugin'

export default defineConfig({
  plugins: [
    themePlugin(),
    markdownPlugin(),
  ],
})
```

The custom theme Plugin must register the layout components KawaPress needs to render pages. Changing a Preset means changing the outer configuration function; there is no separate `presets` list to maintain.

## Find the Extension Point from the Work

When writing an extension, start by asking where the work happens:

| What you want to do | Extension point |
| --- | --- |
| Change site configuration | Generator Plugin `config()` |
| Extend Markdown syntax | Generator Plugin `markdown()` |
| Change data for each page | Generator Plugin `pageData()` |
| Add or adjust Vite behavior | Generator Plugin `vite()` |
| Install a Vue plugin or global component | Runtime Plugin `vueApp()` |
| Add navigation guards or runtime route behavior | Runtime Plugin `router()` |
| Provide a complete experience ready to use | Preset |

One feature may use several entries in this table, but it should still ship as one plugin package. Extension points place work in the correct stage. Plugin identity gathers that work back into one feature.
