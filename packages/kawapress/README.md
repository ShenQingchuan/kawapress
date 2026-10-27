# kawapress

The KawaPress core: the CLI, the generator and the runtime, plus the nagi preset and its official plugins.

[![npm version](https://img.shields.io/npm/v/kawapress?label=npm&color=42b883)](https://www.npmjs.com/package/kawapress) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/kawapress/README.zh-CN.md)

`kawapress` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- **Real SSR in development.** Every first request is server-rendered, so SSR-only problems show up before you build.
- **Vue from end to end.** Markdown becomes Vue components, Vue Router handles navigation, and normal Vue SFCs work inside content.
- **Complete by default.** `kawapress/nagi` gives you a responsive docs layout, dark mode, local search, syntax highlighting, code groups and multilingual navigation.
- **AI-ready output.** Page-level Markdown plus `llms.txt` and `llms-full.txt`.
- **One extension model.** Generator plugins, runtime plugins and presets, with no private theme hooks.

## Install

```sh
npm install --save-dev kawapress
```

`pnpm add --save-dev kawapress` and `yarn add --dev kawapress` work too.

## Usage

A basic site needs only this package. Create `kawapress.config.ts`:

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'My Docs',
})
```

Then run:

```sh
pnpm exec kawapress dev     # development server
pnpm exec kawapress build   # static files in dist
```

To start from a template instead, run `npm create kawapress@latest`.

## Documentation

[Documentation](https://kawapress.dev/en/guide/getting-started) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
