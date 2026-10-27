# @kawapress/plugin-github-alerts

GitHub-style alerts for Markdown, written as `> [!NOTE]`.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-github-alerts?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-github-alerts) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-github-alerts/README-zh-CN.md)

`@kawapress/plugin-github-alerts` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- The same syntax GitHub uses, so a README renders the same way in both places.
- Five types: `NOTE`, `TIP`, `IMPORTANT`, `WARNING` and `CAUTION`.
- Default titles follow the page language. English and Chinese are built in.

## Install

This package is already included in `kawapress`. A site that uses `kawapress/nagi` has it, so there is nothing to install.

Install it yourself only when you build a site without the nagi preset.

```sh
npm install --save-dev @kawapress/plugin-github-alerts
```

`pnpm add --save-dev @kawapress/plugin-github-alerts` and `yarn add --dev @kawapress/plugin-github-alerts` work too.

## Usage

```md
> [!NOTE]
> Highlights information that readers should take into account.

> [!WARNING]
> Critical content that needs immediate attention.
```

```ts
import githubAlertsPlugin from '@kawapress/plugin-github-alerts'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [githubAlertsPlugin()],
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
