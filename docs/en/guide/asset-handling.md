---
description: Reference assets from Markdown, Vue components, and CSS, then use the public assets directory for downloads and site-wide files.
---

# Asset Handling

## Reference Static Assets

Every Markdown page becomes a Vue component and is processed by Vite. Use relative paths for images owned by that page:

```md
![Architecture](./architecture.png)
```

Common image, media, and font files are detected as assets automatically. They can be referenced from Markdown, Vue components, and CSS. Static `src` values, CSS `url(...)` values, and direct imports can all use relative paths.

During a production build, referenced assets are copied to the output with content-hashed filenames. Unused assets are not copied, and very small files may be inlined.

### A Linked File Is Not an Asset

A normal link only provides an address. It does not automatically add its target to the build output:

```md
[Download the handbook](./handbook.pdf)
```

Put PDFs, archives, and other download files in the [public assets directory](#public-directory).

## The Public Assets Directory: `public` {#public-directory}

The public assets directory holds site-wide files such as `robots.txt`, site icons, PWA icons, and downloads.

Its default name is `public`, inside `srcDir`. When `srcDir` is not set, the directory is:

```text
docs/
└─ public/
   └─ handbook.pdf
```

Use `publicDir` to choose a different directory:

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  srcDir: 'content',
  publicDir: 'static',
})
```

This places `handbook.pdf` at `content/static/handbook.pdf`. `publicDir` can also be a nested path such as `assets/public`. Without this option, KawaPress always uses `public`.

Files from this directory are copied directly to the output root. Their names do not change, and they never become pages.

Always reference a public asset from the site root:

```md
[Download the handbook](/handbook.pdf)

![Site icon](/icon.svg)
```

The URL stays `/handbook.pdf` whether the directory on disk is named `public` or `static`.

## `base`

Set `base: '/kawapress/'` when the site is deployed below a subpath such as `https://example.com/kawapress/`. KawaPress adjusts static asset URLs automatically.

A public asset therefore still uses this path:

```md
![Site icon](/icon.svg)
```

Do not write `/kawapress/icon.svg` yourself.

Dynamic URLs are not rewritten automatically. For example, use `withBase()` for a logo path from theme configuration:

```vue
<script setup lang="ts">
import { useSite, withBase } from 'kawapress/client'

const site = useSite()
const logoPath = '/brand/logo.svg'
</script>

<template>
  <img :src="withBase(logoPath, site.base)" alt="Brand logo">
</template>
```

`withBase()` adds the deployment path when needed. To choose from a known set of local assets dynamically, use Vite’s `import` or `import.meta.glob()` patterns.

For asset formats and dynamic import rules, see the [Vite static asset guide](https://vite.dev/guide/assets.html).
