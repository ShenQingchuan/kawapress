---
description: Put images, fonts, and download files in the right place, then use public files and base paths with confidence.
---

# Asset Handling

Images, video, fonts, PDFs, and download files are static assets. They are published with your site, but they are not pages that readers open as articles.

You only need two rules to start:

1. **Keep an asset next to the page or component that owns it, then use a relative path.**
2. **Put a file that must keep its name or be available everywhere in `public`.**

KawaPress passes both kinds of assets to Vite, the tool that builds the site. Vite copies files, prepares their URLs, and helps those URLs keep working when the site is deployed below a subpath.

## Keep Page Assets Together

Imagine that one guide page needs an architecture diagram. Keep the image with that page:

```text
docs/
└─ guide/
   ├─ asset-handling.md
   └─ architecture.png
```

Then write this in `asset-handling.md`:

```md
![Architecture](./architecture.png)
```

`./` means “the folder containing this Markdown file.” KawaPress therefore finds `architecture.png` in the same `guide` folder.

When you build the production site, Vite copies only assets that a page actually uses. Most copied assets receive a filename with a content marker, such as `architecture-abc123.png`. You do not need to write that name yourself. It helps browsers fetch a fresh image after the image changes. Very small files may be included directly in page code instead, which also needs no extra work from you.

In both cases, KawaPress applies the site `base` path. An image that works in local development will also work when the site lives below a path such as GitHub Pages.

### Vue Components and CSS Follow the Same Rule

Use paths relative to the current file for:

- static `src` values in Vue components;
- CSS `url(...)` values;
- images or fonts imported directly in `<script setup>`.

Keeping an asset near the code that uses it makes folders easier to move without losing files.

::: tip A quick way to decide
If removing a page or component would make an asset useless, keep that asset next to the page or component and reference it with `./` or `../`.
:::

## `public` Is for Files Published As-Is

Some files do not belong to one page, or their filenames must not change. Common examples are:

- `robots.txt`;
- site icons;
- PWA icons;
- PDFs, archives, and example files that readers download.

Put these files in `public`.

`public` always lives inside the content source directory. Most sites leave `srcDir` unset, so the site root is the source directory:

```text
docs/
└─ public/
   └─ handbook.pdf
```

When the configuration uses `srcDir: 'content'`, the source directory is `content`, so `public` moves with it:

```text
docs/
└─ content/
   └─ public/
      └─ handbook.pdf
```

During a build, KawaPress copies public files unchanged to the root of the published site:

```text
public/handbook.pdf  →  dist/handbook.pdf
```

Their names do not change, and they do not become Markdown pages. Even a `.md` file inside `public` stays an ordinary file; it never creates a site route.

### Reference a Public File

Start its URL at the public root in Markdown:

```md
[Download the handbook](/handbook.pdf)

![Site icon](/icon.svg)
```

The leading `/` means “the public root of this site.” It does not mean the root of your computer’s filesystem.

For example, a site deployed at `https://example.com/kawapress/` should still use `/handbook.pdf`, **not** `/kawapress/handbook.pdf`. KawaPress adds the `/kawapress/` `base` prefix for you, so you keep one simple path in your content.

::: warning Put downloadable files in `public`
A link such as `[PDF](./handbook.pdf)` looks reasonable, but an ordinary Markdown link does not ask Vite to copy that file. Put PDFs, archives, and other reader downloads in `public`, then link to `/handbook.pdf`.
:::

## Asset URLs Chosen at Runtime

Sometimes an image URL is not written directly in a template. It may come from theme configuration, API data, or a variable. For example, a theme may provide the logo path `/brand/logo.svg`.

Vite cannot rewrite that URL automatically because the final value is chosen at runtime. Use this safe pattern instead:

1. Place the file at `public/brand/logo.svg`.
2. Store only `/brand/logo.svg` in configuration.
3. Call `withBase()` in the component before using the URL.

```vue
<script setup lang="ts">
import { useSite, withBase } from 'kawapress/client'

const site = useSite()

// This value could also come from theme configuration.
const logoPath = '/brand/logo.svg'
const logoSrc = withBase(logoPath, site.value.base)
</script>

<template>
  <img :src="logoSrc" alt="Brand logo">
</template>
```

`withBase()` adds the deployment path when one is needed. The same component requests `/brand/logo.svg` locally and `/kawapress/brand/logo.svg` after deployment below `/kawapress/`.

When choosing from a known set of local build-time assets, prefer Vite’s `import` or `import.meta.glob()` patterns. They give the build tool an explicit list of possible files.

A `new URL()` path must also be known during the build. KawaPress renders pages on the server first, so do not treat `new URL()` as a universal solution for code that runs during SSR.

## Choose a Place Quickly

| Your situation | Put it here | Write it like this |
| --- | --- | --- |
| An illustration for one article | Next to the Markdown file | `![Description](./image.png)` |
| An image or font used by one Vue component | Next to the Vue component | Static `src`, CSS `url(...)`, or `import` |
| A fixed-name icon, PDF, or `robots.txt` | `srcDir/public/` | `/icon.svg` or `/handbook.pdf` |
| A public asset URL from config or runtime data | `srcDir/public/` | `withBase('/logo.svg', site.base)` |

Start with this table when you are unsure. For unusual formats, asset inline limits, or more advanced dynamic imports, read the [Vite static asset guide](https://vite.dev/guide/assets.html).
