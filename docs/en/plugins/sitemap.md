---
title: Sitemap
description: Generate sitemap.xml so search engines can discover every page, with support for locales and last modified times.
---

# Sitemap

`sitemap.xml` lists the addresses of every page on a site, so search engines can discover and crawl the content. KawaPress generates it with `@kawapress/plugin-sitemap`. The default nagi preset already includes this plugin, but it is off by default and generates a file only when `hostname` is set.

## Enable the Sitemap {#enable-sitemap}

Set `sitemap.hostname` in `kawapress.config.ts`. It is the absolute address of the site and must start with `http://` or `https://`:

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  base: '/handbook/',
  sitemap: {
    hostname: 'https://example.com',
  },
})
```

The plugin appends `base` to `hostname` automatically, so you do not need to write it twice. The configuration above produces page addresses such as `https://example.com/handbook/guide/routing`.

When `hostname` is not set, the build does not generate a file and does not print any sitemap messages.

When the sitemap is enabled, the build prints `sitemap 正在生成中…` (“Generating sitemap…”) and then reports the number of entries. The file is written to the root of the build output, `dist/sitemap.xml`. After deployment, its address is `https://example.com/handbook/sitemap.xml`.

## Page Scope {#page-scope}

The sitemap contains only pages that the build has generated. A page is excluded when its frontmatter sets `sitemap: false`:

```md
---
sitemap: false
---
```

## Multiple Locales {#multiple-locales}

Pages that contain the same document in different locales list each other as `xhtml:link` alternates. Every address includes all language variants, including itself. The `lang` value comes from the `lang` field in the `locales` configuration. A page that exists in only one language has no alternates.

## Last Modified Time {#last-modified}

When `lastUpdated: true` is set, each page gets a `<lastmod>` element. The time comes from the last git commit that changed the Markdown file:

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  sitemap: {
    hostname: 'https://example.com',
    lastUpdated: true,
  },
})
```

Keep these points in mind when you use this option:

- The plugin reads only git history, not file modification times. After CI checks out the code, file modification times are usually identical, so they are not reliable.
- When the repository is a shallow clone, the plugin prints a warning and skips `<lastmod>` instead of writing a wrong date. In GitHub Actions, set `fetch-depth: 0` when you use `actions/checkout`.
- When the project is not in a git repository, the plugin also prints a warning and skips `<lastmod>`.

Frontmatter can override this behavior for one page. `lastUpdated: false` removes `<lastmod>` from that page. A date string is used as the page's modification time:

```md
---
lastUpdated: '2023-05-06'
---
```

The date must be quoted. An unquoted YAML date is parsed as a `Date` object, but KawaPress page data accepts only values that can be serialized to JSON, so the build fails. A date string that cannot be parsed also fails the build.

The `lastUpdated` value in frontmatter takes effect only when the site sets `lastUpdated: true`.

## Transform Items {#transform-items}

`transformItems` receives all entries before the file is written. It can add, remove, or change entries. When it returns `undefined`, the original entries are kept:

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  sitemap: {
    hostname: 'https://example.com',
    transformItems(items) {
      return items.filter(item => !item.url.startsWith('draft'))
    },
  },
})
```

The `url` of each entry has no leading slash. The `url` of the home page is an empty string.

## Library Options {#library-options}

Every option in `sitemap` except `lastUpdated` and `transformItems` is passed unchanged to the `SitemapStream` of the [sitemap](https://github.com/ekalinin/sitemap.js) library. For example:

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  sitemap: {
    hostname: 'https://example.com',
    lastmodDateOnly: true,
  },
})
```

`hostname` always uses the address that the plugin resolved, which includes `base`.

## Use the Plugin Independently {#use-the-plugin-independently}

A site that does not use nagi can install and configure the same plugin directly:

::: code-group
```sh [npm]
npm install --save-dev @kawapress/plugin-sitemap
```

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-sitemap
```

```sh [Yarn]
yarn add --dev @kawapress/plugin-sitemap
```
:::

```ts
import sitemapPlugin from '@kawapress/plugin-sitemap'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    sitemapPlugin({
      hostname: 'https://example.com',
    }),
  ],
})
```

## Limitations {#limitations}

- A single `sitemap.xml` can contain at most 50,000 entries. The build fails when the limit is exceeded. The plugin does not support sitemap indexes.
- The plugin does not generate `robots.txt`. To declare the sitemap, add this line to `public/robots.txt` yourself:

```text
Sitemap: https://example.com/handbook/sitemap.xml
```

- `public/sitemap.xml` is copied into the output directory before the sitemap is generated. If it has the same name as the generated file, the build fails instead of overwriting it. Delete that file, or use `transformItems` to adjust the content.
