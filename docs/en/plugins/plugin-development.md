---
title: Plugin Development
description: Write KawaPress plugins by extension point, using generator and runtime APIs to build a complete feature.
---

# Plugin Development

This page explains how to write a KawaPress plugin. Before you start, read [Plugin System](/en/plugins/plugin-system) to understand how Generator Plugins, Runtime Plugins, and Presets divide the work.

The examples revolve around an imaginary package, `@acme/kawapress-plugin-notes`. Each part of it demonstrates one API, and together they form a complete package.

## Find the Extension Point from the Work {#find-the-extension-point-from-the-work}

Before writing an extension, ask where the work happens:

| What you want to do | Extension point |
| --- | --- |
| Change site configuration | Generator Plugin `config()` |
| Extend Markdown syntax | Generator Plugin `markdown()` |
| Change data for each page | Generator Plugin `pageData()` |
| Observe the build result of each page | Generator Plugin `pageArtifact()` |
| Add or adjust Vite behavior | Generator Plugin `vite()` |
| Generate static files after the build | Generator Plugin `buildArtifacts()` |
| Install a Vue plugin or global component | Runtime Plugin `vueApp()` |
| Place interface pieces where the theme wants them | Runtime Plugin `addToOutlet()` |
| Add navigation guards or runtime route behavior | Runtime Plugin `router()` |
| Provide a complete experience ready to use | Preset |

One feature may use several entries in this table, but it should still ship as one plugin package.

## Complete Package Layout {#package-layout}

A KawaPress plugin ships as a standard npm package. If it needs both build-time hooks and browser-side code, use the following layout:

```text
@acme/kawapress-plugin-notes
├─ package.json
└─ src
   ├─ index.ts           Default entry: Generator Plugin
   ├─ runtime-plugin.ts  Runtime entry: Runtime Plugin
   └─ NotesBadge.vue     Components and style assets
```

Expose both entries in `package.json`:

```json
{
  "name": "@acme/kawapress-plugin-notes",
  "type": "module",
  "version": "0.1.0",
  "license": "MIT",
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
    "src/**/!(*.test.*)"
  ],
  "peerDependencies": {
    "kawapress": "^0.0.1"
  }
}
```

> **Note**: If a plugin only participates in the build (e.g. extending Markdown or adding Vite plugins), you can omit `./runtime-plugin` and `runtime-plugin.ts`.

## Generator Plugins {#generator-plugin}

A Generator Plugin runs in Node.js during the build to handle configuration, Markdown compilation, page metadata, and build-time assets. It is created with `definePlugin()`. Its `name` is the stable identity of the plugin and should match the npm package name.

### Defining a Generator Plugin {#defining-generator-plugin}

By convention, a plugin exports a factory function so users can pass options:

```ts
// src/index.ts
import { definePlugin } from 'kawapress'

export interface NotesPluginOptions {
  /** A prefix for descriptions, such as `Note: `. */
  prefix?: string
}

export function notesPlugin(options: NotesPluginOptions = {}) {
  const prefix = options.prefix ?? ''

  return definePlugin({
    name: '@acme/kawapress-plugin-notes',
    setup(api) {
      // All generator APIs (api.config, api.markdown, api.pageData, etc.) are called here
      api.pageData((pageData) => {
        pageData.description ??= `${prefix}${pageData.title}`
      })
    },
  })
}

export default notesPlugin
```

Add the plugin to the site configuration (`kawapress.config.ts`):

```ts
import notesPlugin from '@acme/kawapress-plugin-notes'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    notesPlugin({ prefix: 'Note: ' }),
  ],
})
```

The factory function validates and normalizes options, while `setup(api)` only works with normalized values.

### Generator API Overview {#generator-api}

There are six generator methods, all called inside `setup(api)` of `definePlugin()`. A plugin can register one or multiple methods as needed; plugins execute sequentially in the order listed in `plugins`.

A typical generator plugin skeleton looks like:

```ts
// src/index.ts
import { definePlugin } from 'kawapress'

export default function myGeneratorPlugin() {
  return definePlugin({
    name: '@acme/kawapress-plugin-notes',
    setup(api) {
      // 1. Read or modify site configuration
      api.config((config) => { /* ... */ })

      // 2. Extend Markdown compiler
      api.markdown((markdown) => { /* ... */ })

      // 3. Enhance page metadata
      api.pageData((pageData, { file, sourcePath }) => { /* ... */ })

      // 4. Observe page build artifacts
      api.pageArtifact((pageArtifact) => { /* ... */ })

      // 5. Inject Vite plugins or options
      api.vite((vite) => { /* ... */ })

      // 6. Emit static files after full build
      api.buildArtifacts(async (context) => { /* ... */ })
    },
  })
}
```

Below is the detailed usage for each method.

### `api.config()` {#config}

`config()` runs after the site configuration has been normalized. The handler receives the real site configuration object and can change it directly.

```ts
// Inside setup(api):
api.config((config) => {
  config.title ??= 'My Docs'
})
```

A plugin that needs the language, deployment base, or source directory can record the values here and use them in later methods.

### `api.markdown()` {#markdown}

`markdown()` runs when the Markdown compiler is created. The handler receives the real `MarkdownExit` instance.

```ts
import { notePlugin } from 'markdown-it-example-note'

api.markdown((markdown) => {
  markdown.use(notePlugin)
})
```

If a markdown-it plugin's types do not match KawaPress exactly, use `useMarkdownItPlugin()`. It preserves the plugin's parameter types and handles the type compatibility in one place:

```ts
import { useMarkdownItPlugin } from 'kawapress'

api.markdown((markdown) => {
  useMarkdownItPlugin(markdown, notePlugin, { className: 'acme-note' })
})
```

#### Bring Your Own Component into the Page {#page-components}

Some plugins render their own components, such as charts or interactive examples. `addPageComponent()` tells KawaPress that this page uses a component, and KawaPress writes the matching import into the SFC of that page, so Vue resolves the tag in the template:

```ts
import { addPageComponent } from 'kawapress'

api.markdown((markdown) => {
  const renderFence = markdown.renderer.rules.fence
  markdown.renderer.rules.fence = (tokens, index, options, env, renderer) => {
    if (tokens[index].info.trim() !== 'acme-chart') {
      return renderFence(tokens, index, options, env, renderer)
    }
    addPageComponent(env, { name: 'AcmeChart', from: '@acme/chart' })
    return '<AcmeChart />'
  }
})
```

`env` is the environment object of the page being rendered. Rules, fence renderers and Shiki highlight callbacks all receive it, so pass the one you get. `name` is the tag used in the template and also the generated import binding; `from` is the module that default-exports the component, either a package name or an absolute path.

Markdown authors declare nothing. The component loads only on the pages that use it, and a page without that fence downloads nothing extra for it. A `<script setup>` the author wrote is kept, and the import is added to the same block. A page with only a plain `<script>`, or with no script at all, gets a `<script setup>` with the same `lang`.

### `api.pageData()` {#page-data}

`pageData()` runs after the `pageData` of each page has been generated. The handler receives the editable data for the current page:

```ts
api.pageData((pageData) => {
  pageData.description ??= `Notes for ${pageData.title}`
})
```

`pageData` is serialized for the runtime, so it may contain only JSON-compatible values: strings, numbers, booleans, `null`, arrays, and plain objects. `Date`, `Map`, functions, and class instances cannot be written directly. For example, the following code makes the build fail:

```ts
api.pageData((pageData) => {
  pageData.frontmatter.reviewedAt = new Date('2026-10-08')
})
```

Use a string such as `'2026-10-08'` instead, and parse it where needed.

The second argument of the handler tells you where the page comes from: `file` is the absolute path of the Markdown source, and `sourcePath` is the path relative to `srcDir`, such as `/guide/intro.md`. Use it when you need information about the file, like its last git commit. Do not guess the file from the route: `/guide` can come from either `guide.md` or `guide/index.md`.

```ts
api.pageData((pageData, { file, sourcePath }) => {
  pageData.frontmatter.source = sourcePath
})
```

Both values stay on the generator side and are never sent to the browser. Copy what the page needs into `pageData`, as above.

A `title` you change in `pageData()` only affects that page's own data. It does not reach the page summaries used for navigation, which describe the title the author wrote in Frontmatter or in the first level-1 heading.

### Add your fields to the types {#extend-types}

Readers of a field you write in `pageData()` should see its type too. KawaPress leaves three types open for plugins to extend:

| Type | Where it is used |
| --- | --- |
| `PageData` | The page data from `usePageData()` and `pageData()` |
| `PageFrontmatter` | Page frontmatter. Any key an author writes is still allowed, typed `unknown` |
| `ThemeConfig` | `themeConfig` of the site and of each language |

Add your fields in the plugin package with `declare module 'kawapress'`:

```ts
// src/index.ts
declare module 'kawapress' {
  interface PageData {
    /** Time of the last commit, in milliseconds. */
    lastUpdated?: number
  }

  interface PageFrontmatter {
    /** Write `false` to hide the update time of this page. */
    lastUpdated?: boolean
  }
}
```

Once a site imports your plugin, the fields work everywhere:

```ts
const page = usePageData()
page.value?.lastUpdated // number | undefined, no cast needed
```

The fields that several plugins add merge into one type. A plugin that is not installed adds nothing.

Keep three things in mind:

- **Make every field optional.** A site may not have installed your plugin, and frontmatter is written by hand, so the value may be missing.
- **The types are a compile-time help.** The type in `PageFrontmatter` describes how an author *should* write the value. It does not guarantee the runtime value, so keep checking when you read it, for example `comments !== false`.
- **Use only JSON-compatible values.** The reason is the same as for `pageData()` above.

### `api.pageArtifact()` {#page-artifact}

`pageArtifact()` runs after a page has been compiled from Markdown and all `pageData()` handlers have finished. The handler can read the result but cannot change the source file, data, or route of the page.

```ts
const sourcePaths = new Map<string, string>()

api.pageArtifact((artifact) => {
  sourcePaths.set(artifact.routePath, artifact.sourcePath)
})
```

If you only need all pages when the build finishes, prefer `buildArtifacts()`.

### `api.vite()` {#vite}

`vite()` runs after KawaPress has assembled the base Vite configuration. The handler receives the complete `UserConfig` and can change it directly.

```ts
import { someVitePlugin } from 'some-vite-plugin'

api.vite((config) => {
  config.plugins ??= []
  config.plugins.push(someVitePlugin())
})
```

KawaPress checks the conditions required for rendering before it creates Vite. A plugin cannot bypass those conditions by changing the Vite configuration.

#### Declare the Dependencies Your Runtime Code Uses {#runtime-dependencies}

When your runtime code imports a package, declare it in `vite()` with `useRuntimeDependencies()`. The dev server then prepares the package up front. Without the declaration, Vite discovers it while the first page that needs it is loading and reloads the whole page; the server render bundles it as well instead of loading a second copy of Vue.

```ts
import { useRuntimeDependencies } from 'kawapress/generator'

api.vite((config) => {
  useRuntimeDependencies(config, '@your-scope/plugin-name', ['some-browser-lib'])
})
```

The second argument is the package that really depends on it, usually your own plugin package. A site normally installs `kawapress` or a preset, not the packages inside a plugin, so the function follows the dependencies declared in `package.json` to work out how the site reaches your package, then declares the dependency in Vite's `owner > dependency` form. It only affects the dev server, never the built site.

### `api.buildArtifacts()` {#build-artifacts}

`buildArtifacts()` runs only during `kawapress build`. It runs after all Vite builds have finished and before HTML prerendering. The handler receives all pages and an `emitFile()` function:

```ts
api.buildArtifacts(async ({ pages, emitFile }) => {
  const routes = pages.map(page => page.routePath)
  await emitFile('notes/routes.json', `${JSON.stringify(routes, null, 2)}\n`)
})
```

`emitFile()` accepts only relative paths inside the output directory. Absolute paths, paths containing `..`, and files that conflict with `public/` or with output from another plugin fail immediately. `pages` is sorted by source path, so the result is stable.

### Produce Different Output per Language {#localized-output}

Plugins for a multilingual site usually need different labels or files per language. To find out which language a route belongs to, do not split the path yourself. Use `resolveLocaleIndex()`:

```ts
import { resolveLocaleIndex, useMarkdownItPlugin } from 'kawapress'

const LABELS: Record<string, string> = {
  root: 'Note',
  zh: '说明',
}

let localeKeys = ['root']

api.config((config) => {
  localeKeys = Object.keys(config.locales ?? { root: {} })
})

api.markdown((markdown) => {
  useMarkdownItPlugin(markdown, notePlugin, {
    // '/zh/guide' resolves to 'zh', '/guide' to 'root'
    title: (env: { path?: string }) =>
      LABELS[resolveLocaleIndex(env.path ?? '/', localeKeys)] ?? LABELS.root,
  })
})
```

It applies the same rule KawaPress uses for the site itself: `root` owns every path outside the other language prefixes, and the longest matching prefix wins. `/en` only claims `/en` and `/en/...`, so `/english` stays on the root locale. `/zh-hant` is longer than `zh`, so configuring both still picks the right one. The query string and hash are ignored, which keeps `/zh/guide?tab=api` on `zh`.

The function is pure and works on the runtime side too; import it from `kawapress/client` there.

### List Pages and Read Their Titles {#page-list-and-title}

When you build your own navigation, index, or search data, start from the list of pages. `listMarkdownPages()` from `kawapress/generator` applies exactly the same rules as KawaPress itself: it skips directories that start with `.` and the `dist` and `node_modules` directories, leaves out `publicDir`, and sorts by name.

```ts
import { resolve } from 'node:path'
import { listMarkdownPages } from 'kawapress/generator'

let srcDir = '.'

api.config((config) => {
  srcDir = config.srcDir ?? '.'
})

api.vite((config) => {
  config.plugins ??= []
  config.plugins.push({
    name: 'your-plugin:pages',
    async configResolved(resolved) {
      // sourceRoot holds the pages; publicDir holds files copied as they are, so it holds none
      const pages = await listMarkdownPages({
        sourceRoot: resolve(resolved.root, srcDir),
        publicDir: resolved.publicDir,
      })
      // Each entry looks like
      // { file: '/site/src/guide/intro.md', sourcePath: '/guide/intro.md', routePath: '/guide/intro' }
      console.log(pages.map(page => page.routePath))
    },
  })
})
```

Read the title and the `layout` of a page with `createPageSummaryReader()`:

```ts
import { readFile } from 'node:fs/promises'
import { createPageSummaryReader } from 'kawapress/generator'

const reader = createPageSummaryReader()
const source = await readFile(page.file, 'utf8')
const { title, layout } = reader.read(source, page.file)
```

It only parses Markdown and never renders a page: no `pageData()` handler runs, and Markdown plugins, Shiki, Twoslash and MathJax stay out of it, so listing a whole site does not compile it first. The title follows the same rule as the page itself: `title` from the frontmatter when it is there, otherwise the plain text of the first level-one heading, which drops formatting markup while formulas stay as written. `layout` is the string written in the frontmatter, or `undefined`.

The same file with the same content reuses the previous result, so reading a whole site repeatedly stays cheap. The theme reads titles exactly this way when it builds the automatic sidebar.

A dev server reports changed files as absolute paths: `isMarkdownPage()` tells you whether such a file is a page, and `markdownFileToRoutePath()` turns it back into a route path.

## Runtime Plugins {#runtime-plugin}

A Runtime Plugin operates in the browser and SSR runtime. Its code enters the site's Vite module graph, allowing it to statically import `.vue` files, CSS, and regular Vue plugins.

It lives in the same package as the Generator Plugin and is exposed through the `./runtime-plugin` entry. Its `name` must also match the package name.

### Defining a Runtime Plugin {#defining-runtime-plugin}

A Runtime Plugin is created with `defineRuntimePlugin()`. All runtime extension logic executes inside `setup(api)`:

```ts
// src/runtime-plugin.ts
import { defineRuntimePlugin } from 'kawapress'

export default defineRuntimePlugin({
  name: '@acme/kawapress-plugin-notes',
  setup(api) {
    // All runtime APIs (api.vueApp, api.addToOutlet, api.router) are called here
  },
})
```

Below is the detailed usage for each runtime method.

### `api.vueApp()` {#vue-app}

`vueApp()` receives the real Vue `App` instance. It is the right place to call `app.use()` and register global components:

```ts
// src/runtime-plugin.ts
import { defineRuntimePlugin } from 'kawapress'
import NotesBadge from './NotesBadge.vue'

export default defineRuntimePlugin({
  name: '@acme/kawapress-plugin-notes',
  setup(api) {
    api.vueApp((app) => {
      app.component('NotesBadge', NotesBadge)
    })
  },
})
```

`NotesBadge.vue` is an ordinary Vue component. After registration, pages can use it by the name `NotesBadge`.

### `api.addToOutlet()` {#add-to-outlet}

`addToOutlet()` mounts a plugin's interface into a predefined spot provided by the theme.

Interface elements like search buttons, copy buttons, and comment sections belong to the page frame rather than the Markdown document body. Plugins and themes do not need to know about each other directly. Instead, they collaborate through **Outlets**:

1. **Themes provide spots**: The theme places `<KawaOutlet name="..." />` at appropriate positions in its layout templates.
2. **Plugins provide components**: The plugin calls `api.addToOutlet()` in its Runtime Plugin to inject its components into those spots.

```ts
// src/runtime-plugin.ts
import { defineRuntimePlugin } from 'kawapress'
import CopyPageButton from './CopyPageButton.vue'

export default defineRuntimePlugin({
  name: '@acme/kawapress-plugin-notes',
  setup(api) {
    api.addToOutlet('doc.header', {
      id: 'copy-page',
      component: CopyPageButton,
    })
  },
})
```

#### Standard Outlets

KawaPress defines four standard outlets:

| Outlet | Placed by | Location & Purpose | Typical Content |
| --- | --- | --- | --- |
| `header.actions` | Theme | Top navigation bar action area | Search trigger, repository link, dark mode toggle |
| `doc.header` | KawaPress automatically | Directly below the first `<h1>` in the document body (only appears when an H1 is present) | Copy page button, reading time, page tools |
| `doc.footer` | Theme | Information area between document body end and footer | Last updated date, edit-this-page link |
| `doc.after` | Theme | Below the entire document body | Comments, feedback form, prev/next pagination |

> **Note**: Except for `doc.header` which is mounted automatically by KawaPress below the first heading, the other three outlets are placed freely by the theme in its templates.

#### Rules & Notes

- **Namespaces & IDs**: The `id` must be unique within the plugin. KawaPress automatically prefixes it as `<plugin-name>:<id>` to avoid conflicts.
- **Render Order**: Items render in the order plugins appear in the `kawapress.config.ts` `plugins` array first, then in the order `addToOutlet()` was called within the plugin. There are no numeric weights.
- **Validation & Warnings**: Invalid outlet names, empty IDs, or duplicate IDs within a plugin throw errors immediately. If a plugin injects into an outlet that the current theme never renders, `kawapress build` emits a warning.
- **Provide Logic-Only Composables**: If you want themes to be able to fully customize this UI, consider exporting a composable (such as `useCopyPage()`). Themes can then reuse the underlying logic with their own components.

### Wrap Plugin Styles in the `kawa.plugin` Layer {#plugin-styles}

Wrap every default plugin style in `@layer kawa.plugin { ... }` and read only `--kawa-*` tokens:

```css
@layer kawa.plugin {
  .acme-notes-badge {
    color: var(--kawa-c-text-2);
    border: 1px solid var(--kawa-c-border);
    border-radius: var(--kawa-radius);
  }
}
```

Three things follow from this: theme styles beat plugin styles without `!important`, the plugin needs no fallback colors and therefore looks right in every theme, and switching themes never touches plugin code.

Do not read another theme's private variables such as `--nagi-*`, and do not invent a second set of shared color variables. Values that really belong to one plugin, such as a search dialog width, can stay private to that plugin.

Do not scope plugin styles to one theme's content container either, such as `.nagi-doc .kawa-container`. Build selectors from the plugin's own `.kawa-*` classes plus ARIA and native attributes, so the styles keep working under any theme.

### `api.router()` {#router}

`router()` receives the KawaPress `Router`, which keeps the names and the usage of Vue Router wherever the two overlap. It is the right place to add navigation guards: `beforeEach()` cancels a navigation by returning `false`, and a plugin that wants another URL calls `router.push()` itself.

```ts
api.router((router) => {
  router.beforeEach((to) => {
    // For example: a draft page is only reachable during local development
    if (to.path === '/notes/draft' && import.meta.env.PROD) {
      return false
    }
  })
})
```

`afterEach()` runs once a navigation committed, which suits cleaning up state that belonged to the previous page:

```ts
api.router((router) => {
  router.afterEach(() => {
    closeDialog()
  })
})
```

The `Router` covers what a documentation site needs (navigation, the current route, hooks before and after a navigation). It has no `addRoute()`, named routes, dynamic parameters or redirects. Add a Markdown file for a new page; when you need a list of pages, publish your own virtual module from a Generator Plugin.

### Runtime Notes {#runtime-notes}

A Runtime Plugin runs once for each Vue App. During server rendering, every render creates a new App. In the browser, the App is created once when the site starts. Therefore, do not store state in module scope if that state belongs to one render.

A Runtime Plugin also runs on the server and in the browser. Before you access browser objects such as `window` or `document`, read [SSR Compatibility](/en/guide/ssr-compatibility).

## Publishing Checklist {#publish-checklist}

Before you publish, check each item:

- The `name` in `package.json` exactly matches the `name` of the Generator Plugin.
- Expose `./runtime-plugin` only when the plugin has a Runtime Plugin.
- `files` includes only the source files needed by consumers and excludes test files.
- Declare `kawapress` as a `peerDependency` so that a site does not install a second copy of the core package.
- Include the license file and documentation in the package.

## Debugging and Common Errors {#debugging}

When a plugin fails, the error message includes the plugin identity, the execution surface, and the capability name. For example:

```text
[@acme/kawapress-plugin-notes / generator / pageData] Plugin execution failed.
```

This means that `@acme/kawapress-plugin-notes` failed in the generator `pageData()` capability. These three parts show where to look.

Also keep these boundaries in mind:

- Generator and runtime code run at different stages. Do not make one side depend on state stored in a module of the other side.
- Do not use `eval` or `new Function` in `buildArtifacts()` to bypass module boundaries. To load a module, use `importModule()`.
- 0.1 does not provide `addPage()`. When you need a new page, create it in a Markdown source file first.
