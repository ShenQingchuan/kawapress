# @kawapress/plugin-unocss

UnoCSS for KawaPress, so you can write utility classes in Markdown.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-unocss?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-unocss) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-unocss/README.zh-CN.md)

`@kawapress/plugin-unocss` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Utility classes work in the HTML you write in Markdown and in Vue components.
- Defaults to `presetWind4`, `presetIcons` and `presetWebFonts`.
- Takes any UnoCSS Vite plugin option, so you can add presets, rules and shortcuts.

## Install

This package is already included in `kawapress`. A site that uses `kawapress/nagi` has it, so there is nothing to install.

Install it yourself only when you build a site without the nagi preset.

```sh
npm install --save-dev @kawapress/plugin-unocss
```

`pnpm add --save-dev @kawapress/plugin-unocss` and `yarn add --dev @kawapress/plugin-unocss` work too.

## Usage

```ts
import unocssPlugin from '@kawapress/plugin-unocss'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [unocssPlugin()],
})
```

Then use the classes in Markdown:

```md
<div class="rounded-lg bg-black/5 p-4">Styled by UnoCSS.</div>
```

Passing `presets` replaces the default presets.

## Documentation

[Documentation](https://kawapress.dev/en/guide/getting-started#use-unocss-utilities) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
