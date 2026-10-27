# @kawapress/plugin-code-group

Group several code blocks into accessible tabs.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-code-group?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-code-group) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-code-group/README.zh-CN.md)

`@kawapress/plugin-code-group` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Show npm, pnpm and Yarn commands side by side without repeating the surrounding text.
- Tabs are named from the fence, for example ` ```sh [pnpm] `.
- Keyboard and screen reader friendly tabs.
- Only fenced code blocks are allowed inside a group. Anything else stops the build with a clear message.

## Install

This package is already included in `kawapress`. A site that uses `kawapress/nagi` has it, so there is nothing to install.

Install it yourself only when you build a site without the nagi preset.

```sh
npm install --save-dev @kawapress/plugin-code-group
```

`pnpm add --save-dev @kawapress/plugin-code-group` and `yarn add --dev @kawapress/plugin-code-group` work too.

## Usage

````md
::: code-group
```sh [npm]
npm install kawapress
```

```sh [pnpm]
pnpm add kawapress
```
:::
````

```ts
import codeGroupPlugin from '@kawapress/plugin-code-group'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [codeGroupPlugin()],
})
```

## Documentation

[Documentation](https://kawapress.dev/en/guide/markdown-extensions) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
