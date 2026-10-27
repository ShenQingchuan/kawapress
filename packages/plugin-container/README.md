# @kawapress/plugin-container

Callout containers for Markdown: info, tip, warning, danger and a collapsible details.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-container?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-container) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-container/README.zh-CN.md)

`@kawapress/plugin-container` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Five types: `info`, `tip`, `warning`, `danger` and a collapsible `details`.
- A custom title after the type, with inline Markdown allowed in it.
- Default titles follow the page language. English and Chinese are built in.

## Install

This package is already included in `kawapress`. A site that uses `kawapress/nagi` has it, so there is nothing to install.

Install it yourself only when you build a site without the nagi preset.

```sh
npm install --save-dev @kawapress/plugin-container
```

`pnpm add --save-dev @kawapress/plugin-container` and `yarn add --dev @kawapress/plugin-container` work too.

## Usage

````md
::: tip
Run a production build locally to catch deployment problems earlier.
:::

::: danger **Stop and check the configuration**
Never commit access tokens to a Git repository.
:::
````

```ts
import containerPlugin from '@kawapress/plugin-container'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [containerPlugin()],
})
```

## Options

| Option | Description |
| --- | --- |
| `labels` | Override the default titles for every language. |
| `localeLabels` | Override the default titles for one language. The key is a name from `locales`. |

## Documentation

[Documentation](https://kawapress.dev/en/guide/markdown-extensions) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
