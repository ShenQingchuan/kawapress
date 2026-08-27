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

### Plugin Package Export Conventions {#plugin-package-exports}

A Plugin published to npm exposes its Generator Plugin from the default entry and may expose a `./runtime-plugin` entry:

```json
{
  "name": "@kawapress/plugin-search",
  "type": "module",
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
  "files": [
    "src"
  ]
}
```

The `package.json` name, Generator Plugin name, and Runtime Plugin name should match. KawaPress reads this name from the configured Generator Plugin, then checks whether the package with that name exposes `./runtime-plugin`. When it does, the runtime entry is loaded automatically.

A build-only Plugin does not expose `./runtime-plugin`. A Plugin used only in the page runtime still needs a default entry whose Generator Plugin declares its stable identity; its `setup()` does not need to register any Hooks.

The site always imports the default entry only:

```ts
import searchPlugin from '@kawapress/plugin-search'

const plugins = [
  searchPlugin(),
]
```

Do not ask site authors to import `@kawapress/plugin-search/runtime-plugin`. Generation and runtime happen at different stages, but the feature still has one installation and one configuration.

### Publish TypeScript Source Directly

KawaPress Plugins are best written in TypeScript and can publish `.ts`, `.vue`, and CSS source files directly. A separate bundling step is not required.

The `exports` example above already uses the recommended source-package form. KawaPress loads the Generator Plugin through Vite Module Runner. The Runtime Plugin, its Vue SFCs, and its CSS enter the site's Vite module graph. Vite performs the final syntax transforms, dependency resolution, and browser build.

Use the standard `types`, `import`, and `default` conditions for a source package. A custom `source` condition is not needed. Include the source directory in the published npm package through `files`.

Publishing source is recommended, not required. A precompiled ESM Plugin also works when `types` points to its declarations and `import` and `default` point to its JavaScript output.

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
