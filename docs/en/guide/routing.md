---
description: Learn how KawaPress maps Markdown files to URLs and handles links, source directories, and deployment bases.
---

# Routing

KawaPress uses file-based routing. There is no separate route table to maintain. Each Markdown file becomes a page, and its location determines the public URL.

If you have completed [Getting Started](/en/guide/getting-started), this guide explains the routing rules used by that project.

## File-Based Routing

Given this directory structure:

```text
.
├─ guide/
│  ├─ getting-started.md
│  └─ index.md
├─ index.md
└─ about.md
```

KawaPress creates these routes and static files:

| Markdown file | Public path | Build output |
| --- | --- | --- |
| `index.md` | `/` | `dist/index.html` |
| `about.md` | `/about` | `dist/about.html` |
| `guide/index.md` | `/guide` | `dist/guide.html` |
| `guide/getting-started.md` | `/guide/getting-started` | `dist/guide/getting-started.html` |

Directories form the URL hierarchy, and the file name becomes the final segment. Public URLs omit both `.md` and `.html`.

Your static host must resolve a request such as `/guide/getting-started` to its `.html` file. The KawaPress preview server supports this behavior. On another platform, enable clean URLs or HTML extension fallback.

## How `index.md` Works

The root `index.md` maps to `/`. An `index.md` inside a directory removes the trailing `/index` segment:

```text
index.md             → /
guide/index.md       → /guide
guide/setup/index.md → /guide/setup
```

Do not create both `guide.md` and `guide/index.md`. They map to the same `/guide` route, so choose one structure.

## Site Root and Source Directory

The current working directory is the **site root** when you run `kawapress dev` or `kawapress build`. By default, KawaPress reads `kawapress.config.ts` and Markdown pages from this directory and writes the build to `dist`.

Set `srcDir` to keep Markdown content in a relative subdirectory:

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  srcDir: 'docs',
})
```

The project can then use this structure:

```text
my-site/
├─ docs/
│  ├─ guide/
│  │  └─ getting-started.md
│  └─ index.md
├─ kawapress.config.ts
└─ package.json
```

`srcDir` changes where KawaPress reads Markdown. It does not add a segment to public routes:

```text
docs/index.md                 → /
docs/guide/getting-started.md → /guide/getting-started
```

The value must be relative to the site root. Absolute `srcDir` paths are not supported.

## Linking Between Pages

Links to another KawaPress page may be extensionless or end in `.md` or `.html`. Both relative and site-root paths work:

```md
[Getting Started](./getting-started)
[Getting Started](./getting-started.md)
[Getting Started](./getting-started.html)
[Getting Started](/en/guide/getting-started)
[Home](/en/index.md)
```

KawaPress resolves relative paths from the current Markdown source file, then normalizes all three page-link forms to an extensionless public route. Extensionless links mirror the URL readers see, while `.md` links help editors and GitHub open the source file directly. Choose one style and use it consistently within a site.

Use a heading anchor to link within a page. For example, [go to the source directory section](#site-root-and-source-directory).

KawaPress generates stable anchors for Markdown headings. The page outline in the default theme uses the same anchors.

Use a complete URL for an external page, such as the [Vue website](https://vuejs.org/). External Markdown links open in a new tab and automatically include `rel="noreferrer"`.

## Deploying Under a Base Path

A site may be served below the domain root, for example:

```text
https://example.com/my-docs/
```

Set `base` to that deployment path:

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  base: '/my-docs/',
})
```

`base` must start with `/`. KawaPress normalizes the trailing slash and applies the same prefix to Vite assets, Vue Router, prerendered pages, and root-relative Markdown links.

Keep using logical routes in Markdown instead of repeating `/my-docs/` throughout the content:

```md
[Getting Started](/en/guide/getting-started)
```

The built link points to `/my-docs/en/guide/getting-started`. Moving the site later requires changing only the `base` setting.

## Initial Requests and Client Navigation

On the initial request, KawaPress renders the matched route on the server. The browser then hydrates that HTML. Readers see complete content before client-side rendering takes over.

After hydration, Vue Router handles normal same-site links:

```text
Initial request
  → render the current page on the server
  → hydrate in the browser
  → follow an internal link
  → load and display the target page with Vue Router
```

The initial request and production build therefore share SSR semantics, while later navigation avoids a full-page reload. External links, downloads, links with a `target`, and modified clicks that open a new tab keep their native browser behavior.

## Why Vue Router?

VitePress does not ship Vue Router as a runtime dependency. Its client includes a [small, purpose-built router](https://github.com/vuejs/vitepress/blob/main/src/client/app/router.ts) that handles page-module loading, browser history, scroll positions, and navigation hooks. This keeps the dependency surface focused and gives VitePress direct control over its page-loading pipeline.

KawaPress uses the official [Vue Router](https://router.vuejs.org/). Markdown files still become routes automatically, so site authors do not maintain a route table. Internally, however, those pages are managed by a real Vue Router instance: SSR uses memory history, the browser uses web history, and Runtime Plugins can use navigation guards and route records directly.

| Concern | VitePress router | Vue Router in KawaPress |
| --- | --- | --- |
| Runtime cost | No Vue Router dependency; the API covers documentation needs | Adds a general-purpose dependency and capabilities a basic documentation site may not use |
| Extension model | Uses VitePress-specific routing and page-loading hooks | Uses the standard Vue Router instance, guards, and route-record APIs |
| Maintenance | Owns and controls the full routing implementation | Reuses the Vue ecosystem's mature router while adapting it to KawaPress SSR and SSG boundaries |

Neither choice is universally better. VitePress optimizes for a small, specialized runtime. KawaPress prioritizes a shared Vue extension boundary, so themes and Runtime Plugins do not need to learn a framework-specific router.

The static build generates pages from Markdown files discovered at build time. Use `router.addRoute()` for routes needed only while the client app is running. If a page must support direct visits and prerendering, create it as a Markdown file.

## Not Found Pages

When no Markdown file matches a path, the development server returns a `404` status and the default interface displays its not-found page. `kawapress build` also generates `dist/404.html` for static hosts.

KawaPress 0.1 routes come from Markdown files. Route rewrites, dynamic routes, and plugin-provided virtual pages are not included. Add a Markdown file whenever the site needs another page.
