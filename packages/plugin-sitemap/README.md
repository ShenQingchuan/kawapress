# @kawapress/plugin-sitemap

sitemap.xml output for KawaPress, with locale alternates and last modified times.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-sitemap?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-sitemap) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-sitemap/README.zh-CN.md)

`@kawapress/plugin-sitemap` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Off by default. It writes a file only after you set `hostname`.
- The site `base` is added to the address for you.
- Pages that exist in several languages list each other as alternates.
- Optional `<lastmod>` from the last git commit of each Markdown file.
- A page can opt out with `sitemap: false` in its frontmatter.

## Install

This package is already included in `kawapress`. A site that uses `kawapress/nagi` has it, so there is nothing to install.

Install it yourself only when you build a site without the nagi preset.

```sh
npm install --save-dev @kawapress/plugin-sitemap
```

`pnpm add --save-dev @kawapress/plugin-sitemap` and `yarn add --dev @kawapress/plugin-sitemap` work too.

## Usage

```ts
import sitemapPlugin from '@kawapress/plugin-sitemap'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    sitemapPlugin({
      hostname: 'https://example.com',
      lastUpdated: true,
    }),
  ],
})
```

The file is written to `dist/sitemap.xml`. It does not write `robots.txt`.

## Options

| Option | Description |
| --- | --- |
| `hostname` | The absolute address of the site. Without it no file is written. |
| `lastUpdated` | Add `<lastmod>` to every page, from git history. Default off. |
| `transformItems` | Add, remove or change entries before the file is written. |

## Documentation

[Documentation](https://kawapress.dev/en/plugins/sitemap) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
