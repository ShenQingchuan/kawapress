# @kawapress/plugin-shiki

Code highlighting for KawaPress, with light and dark themes and optional Twoslash type hints.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-shiki?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-shiki) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-shiki/README.zh-CN.md)

`@kawapress/plugin-shiki` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Highlights code at build time with [Shiki](https://shiki.style), so readers download no highlighter.
- Light and dark themes switch together with the site appearance.
- Line notations in comments: `[!code highlight]`, `[!code focus]`, `[!code ++]`, `[!code --]`, `[!code warning]` and `[!code error]`.
- Optional [Twoslash](https://twoslash.netlify.app): mark a block with `ts twoslash` and hover to see types.

## Install

This package is already included in `kawapress`. A site that uses `kawapress/nagi` has it, so there is nothing to install.

Install it yourself only when you build a site without the nagi preset.

```sh
npm install --save-dev @kawapress/plugin-shiki
```

`pnpm add --save-dev @kawapress/plugin-shiki` and `yarn add --dev @kawapress/plugin-shiki` work too.

## Usage

```ts
import shikiPlugin from '@kawapress/plugin-shiki'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    shikiPlugin({
      themes: { light: 'github-light', dark: 'github-dark' },
      twoslash: true,
    }),
  ],
})
```

## Options

| Option | Description |
| --- | --- |
| `theme` | One Shiki theme for both appearances. Default `github-light`. |
| `themes` | A `{ light, dark }` pair. Use it instead of `theme`. |
| `langs` | Languages to load. A common set is loaded by default. |
| `transformers` | Extra Shiki transformers. |
| `twoslash` | `true`, or Twoslash options, to turn on type hints for `ts twoslash` blocks. |

## Documentation

[Documentation](https://kawapress.dev/en/guide/markdown-extensions) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
