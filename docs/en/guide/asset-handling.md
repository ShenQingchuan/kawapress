---
description: Reference static assets from Markdown, Vue components, and CSS, and understand public files and base paths.
---

# Asset Handling

Images, video, fonts, and downloadable files are static assets: they belong to the site but are not pages. KawaPress lets Vite handle them. The practical rule is simple: **use relative paths for assets beside content, and use `public` for files that keep their original names.**

## Reference an Asset Next to a Page

Every Markdown page becomes a Vue Single-File Component. Vite discovers static asset references in Markdown, Vue components, and CSS.

For this structure:

```text
docs/
└─ guide/
   ├─ asset-handling.md
   └─ architecture.png
```

Use a relative path in `asset-handling.md`:

```md
![Architecture](./architecture.png)
```

During a production build, Vite copies the image only when it is used and normally gives it a content-hashed filename. That makes cache updates reliable. Very small assets can be inlined instead. In either case, KawaPress applies the site `base` path for you.

The same rule applies to Vue components and CSS. Use paths relative to the current file in static `src` attributes, `url(...)` declarations, or direct script imports.

::: tip Prefer relative paths
When an image belongs to one document or component, keep it nearby and reference it with `./` or `../`. Moving the content moves its asset with it.
:::

## The `public` Directory

Some files are not directly referenced by a page, or must retain their original filename: `robots.txt`, favicons, PWA icons, and downloadable PDFs are common examples. Put them in `public`.

`public` lives inside the content source directory:

```text
# Default: srcDir is the site root
docs/
└─ public/
   └─ handbook.pdf

# With srcDir: 'content'
docs/
└─ content/
   └─ public/
      └─ handbook.pdf
```

KawaPress copies `public` files unchanged to the output root. They do not receive content hashes and Markdown files in this directory never become routes.

Reference public files from the site root in Markdown:

```md
[Download the handbook](/handbook.pdf)

![Site icon](/icon.svg)
```

The leading `/` means the public root of your site, **not** the filesystem root. Do not manually write `/kawapress/handbook.pdf` when deploying under `/kawapress/`; KawaPress adds `base` automatically.

::: warning Put downloads in `public`
A normal Markdown link such as `[PDF](./handbook.pdf)` does not make Vite collect the file as a page asset. Put PDFs, archives, and other downloadable files in `public`, then link to `/handbook.pdf`.
:::

## Dynamic Asset URLs

Vite can only transform paths it can see during the build. A path read from theme configuration at runtime is not transformed automatically:

```vue
<script setup lang="ts">
import { useSite, withBase } from 'kawapress/client'
import { computed } from 'vue'

const site = useSite()
const logoSrc = computed(() => (
  withBase('/brand/logo.svg', site.value.base)
))
</script>

<template>
  <img :src="logoSrc" alt="Brand logo">
</template>
```

Place this file at `public/brand/logo.svg`. Write `/brand/logo.svg` once, then pass it through `withBase()`; do not concatenate deployment paths yourself. The same code works in local development and under a subpath such as GitHub Pages.

When choosing among a build-time-known set of local assets, prefer Vite's normal `import` or `import.meta.glob()` patterns. A `new URL()` path must also be known at build time, and it is not a general solution for code that runs during KawaPress SSR. KawaPress does not add a private asset-loading API.

## Choose Quickly

| Situation | Put it here | Reference it like this |
| --- | --- | --- |
| An illustration for one page | Next to the Markdown file | `![Description](./image.png)` |
| An image or font owned by one Vue component | Next to the component | Static `src`, CSS `url(...)`, or `import` |
| A fixed-name icon, PDF, or `robots.txt` | `srcDir/public/` | `/icon.svg` or `/handbook.pdf` |
| A public URL read from config or runtime data | `srcDir/public/` | `withBase('/logo.svg', site.base)` |

For Vite's complete rules around asset formats, inline limits, and dynamic imports, see the [Vite static asset guide](https://vite.dev/guide/assets.html).
