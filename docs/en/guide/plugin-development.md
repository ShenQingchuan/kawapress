---
title: Plugin Development
description: Write KawaPress plugins by extension point, using generator and runtime APIs to build a complete feature.
---

# Plugin Development

This page explains how to write a KawaPress plugin. Before you start, read [Plugin System](/en/guide/plugin-system) to understand how Generator Plugins, Runtime Plugins, and Presets divide the work.

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
| Add navigation guards or runtime route behavior | Runtime Plugin `router()` |
| Provide a complete experience ready to use | Preset |

One feature may use several entries in this table, but it should still ship as one plugin package.

## Create a Generator Plugin {#create-a-generator-plugin}

A Generator Plugin is created with `definePlugin()`. Its `name` is the stable identity of the plugin and should match the npm package name. `setup()` receives `api`, and you should register only the methods you actually use.

By convention, a plugin exports a factory function so that users can pass options:

```ts
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
      api.pageData((pageData) => {
        pageData.description ??= `${prefix}${pageData.title}`
      })
    },
  })
}

export default notesPlugin
```

Add the plugin to the site:

```ts
import notesPlugin from '@acme/kawapress-plugin-notes'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    notesPlugin({ prefix: 'Note: ' }),
  ],
})
```

The factory function validates and normalizes the options. `setup()` should use those normalized values instead of reading the raw options again.

## Generator API {#generator-api}

The six generator methods are registered inside `setup(api)`. A handler can be synchronous or asynchronous. Handlers of the same kind run serially in the order the plugins appear in `plugins`.

### `config()`: Read or Change Site Configuration {#config}

`config()` runs after the site configuration has been normalized. The handler receives the real site configuration object and can change it directly.

```ts
api.config((config) => {
  config.title ??= 'My Docs'
})
```

A plugin that needs the language, deployment base, or source directory can record the values here and use them in later methods.

### `markdown()`: Extend the Markdown Compiler {#markdown}

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

### `pageData()`: Change Data for Each Page {#page-data}

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

### `pageArtifact()`: Observe the Build Result of Each Page {#page-artifact}

`pageArtifact()` runs after a page has been compiled from Markdown and all `pageData()` handlers have finished. The handler can read the result but cannot change the source file, data, or route of the page.

```ts
const sourcePaths = new Map<string, string>()

api.pageArtifact((artifact) => {
  sourcePaths.set(artifact.routePath, artifact.sourcePath)
})
```

If you only need all pages when the build finishes, prefer `buildArtifacts()`.

### `vite()`: Adjust the Vite Configuration {#vite}

`vite()` runs after KawaPress has assembled the base Vite configuration. The handler receives the complete `UserConfig` and can change it directly.

```ts
import { someVitePlugin } from 'some-vite-plugin'

api.vite((config) => {
  config.plugins ??= []
  config.plugins.push(someVitePlugin())
})
```

KawaPress checks the conditions required for rendering before it creates Vite. A plugin cannot bypass those conditions by changing the Vite configuration.

### `buildArtifacts()`: Generate Static Files {#build-artifacts}

`buildArtifacts()` runs only during `kawapress build`. It runs after all Vite builds have finished and before HTML prerendering. The handler receives all pages and an `emitFile()` function:

```ts
api.buildArtifacts(async ({ pages, emitFile }) => {
  const routes = pages.map(page => page.routePath)
  await emitFile('notes/routes.json', `${JSON.stringify(routes, null, 2)}\n`)
})
```

`emitFile()` accepts only relative paths inside the output directory. Absolute paths, paths containing `..`, and files that conflict with `public/` or with output from another plugin fail immediately. `pages` is sorted by source path, so the result is stable.

## Runtime API {#runtime-api}

A Runtime Plugin works while the website runs. Its code enters the site's Vite module graph, so it can statically import `.vue` files, CSS, and regular Vue plugins.

It lives in the same package as the Generator Plugin and is exposed through the `./runtime-plugin` entry. Its `name` should also match the package name.

### `vueApp()`: Install Vue Plugins or Global Components {#vue-app}

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

### `router()`: Adjust Runtime Routing {#router}

`router()` receives the real vue-router `Router`. It is the right place to add navigation guards:

```ts
api.router((router) => {
  router.beforeEach((to) => {
    if (to.path === '/old-notes') {
      return '/notes'
    }
    return true
  })
})
```

`router.addRoute()` changes only the runtime routes. It does not generate new static pages automatically.

### Runtime Notes {#runtime-notes}

A Runtime Plugin runs once for each Vue App. During server rendering, every render creates a new App. In the browser, the App is created once when the site starts. Therefore, do not store state in module scope if that state belongs to one render.

A Runtime Plugin also runs on the server and in the browser. Before you access browser objects such as `window` or `document`, read [SSR Compatibility](/en/guide/ssr-compatibility).

## Complete Package Layout {#package-layout}

A plugin with two entries usually uses this layout:

```text
@acme/kawapress-plugin-notes
├─ package.json
└─ src
   ├─ index.ts           default entry: Generator Plugin
   ├─ runtime-plugin.ts  runtime entry: Runtime Plugin
   └─ NotesBadge.vue
```

The `package.json` exposes both entries and publishes only the source files:

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
    "src",
    "!src/**/*.test.*"
  ],
  "peerDependencies": {
    "kawapress": "^0.0.1"
  }
}
```

If the plugin only participates in the build, remove the `./runtime-plugin` entry and `runtime-plugin.ts`.

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
