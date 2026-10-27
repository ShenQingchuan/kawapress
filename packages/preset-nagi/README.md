# @kawapress/preset-nagi

nagi (凪), the default documentation preset of KawaPress.

[![npm version](https://img.shields.io/npm/v/@kawapress/preset-nagi?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/preset-nagi) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/preset-nagi/README.zh-CN.md)

`@kawapress/preset-nagi` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Responsive documentation layout with a sidebar, a page outline and a top navigation bar.
- Light and dark appearance, and a language switcher for multilingual sites.
- A `home` layout for landing pages and a `page` layout for plain content.
- Brings the official plugins for code, containers, search, AI output, sitemap and UnoCSS.

## Install

This package is already included in `kawapress`. A site that uses `kawapress/nagi` has it, so there is nothing to install.

Install it yourself only when you build a site without the nagi preset.

```sh
npm install --save-dev @kawapress/preset-nagi
```

`pnpm add --save-dev @kawapress/preset-nagi` and `yarn add --dev @kawapress/preset-nagi` work too.

## Usage

Import it from `kawapress/nagi` and pass your site configuration:

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'My Docs',
  themeConfig: {
    nav: [{ text: 'Guide', link: '/guide/getting-started' }],
  },
})
```

Plugins you add to `plugins` run after the ones nagi includes, so they can override them.

## Documentation

[Documentation](https://kawapress.dev/en/guide/what-is-kawapress) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
