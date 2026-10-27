# @kawapress/plugin-image-zoom

Click-to-zoom images for KawaPress Markdown content.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-image-zoom?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-image-zoom) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-image-zoom/README.zh-CN.md)

`@kawapress/plugin-image-zoom` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Every Markdown image opens in a large view when clicked. Nothing extra to write.
- Keyboard friendly: `Tab` to the image, `Enter` or `Space` to open, `Esc`, a click or the wheel to close.
- Focus returns to the image that was opened.
- Skips the animation when the reader asks for reduced motion.
- Opt out for one image with `#no-zoom`, or for a page with `imageZoom: false`.

## Install

```sh
npm install --save-dev @kawapress/plugin-image-zoom
```

`pnpm add --save-dev @kawapress/plugin-image-zoom` and `yarn add --dev @kawapress/plugin-image-zoom` work too.

## Usage

```ts
import imageZoomPlugin from '@kawapress/plugin-image-zoom'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [imageZoomPlugin()],
})
```

```md
![Logo](/logo.png)           <!-- zooms -->
![Logo](/logo.png#no-zoom)   <!-- stays as it is -->
```

Only the Markdown image syntax is handled. An HTML `<img>` is left alone.

## Options

| Option | Description |
| --- | --- |
| `labels` | Override the accessible texts for every language: `zoom` and `dialog`. |
| `localeLabels` | Override them for one language. `{alt}` is replaced by the alt text. |

## Documentation

[Documentation](https://kawapress.dev/en/plugins/image-zoom) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
