# @kawapress/plugin-search

Local full-text search for KawaPress. The index loads only when search is first opened.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-search?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-search) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-search/README-zh-CN.md)

`@kawapress/plugin-search` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Runs entirely in the browser. There is no search service to host.
- The index is a separate file that loads on first use, so it never slows the first paint.
- Results are limited to the current language on multilingual sites.
- Understands containers and GitHub alerts, and uses the same heading IDs as the page.
- A page can opt out with `search: false` in its frontmatter.

## Install

This package is already included in `kawapress`. A site that uses `kawapress/nagi` has it, so there is nothing to install.

Install it yourself only when you build a site without the nagi preset.

```sh
npm install --save-dev @kawapress/plugin-search
```

`pnpm add --save-dev @kawapress/plugin-search` and `yarn add --dev @kawapress/plugin-search` work too.

## Usage

```ts
import searchPlugin from '@kawapress/plugin-search'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    searchPlugin({ containers: true, githubAlerts: true }),
  ],
})
```

To keep one page out of the results:

```md
---
search: false
---
```

## Documentation

[Documentation](https://kawapress.dev/en/guide/frontmatter#exclude-a-page-from-search) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
