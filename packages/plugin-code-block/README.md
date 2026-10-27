# @kawapress/plugin-code-block

A language label, a copy button and optional line numbers for code blocks.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-code-block?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-code-block) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-code-block/README.zh-CN.md)

`@kawapress/plugin-code-block` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- A language label on every code block, such as `TypeScript` or `Shell`.
- A copy button. Lines marked as removed with `[!code --]` are left out of the copied text.
- Optional line numbers, with `:no-line-numbers` to opt one block out and `:line-numbers=5` to start at another number.
- Labels follow the page language. English and Chinese are built in.

## Install

This package is already included in `kawapress`. A site that uses `kawapress/nagi` has it, so there is nothing to install.

Install it yourself only when you build a site without the nagi preset.

```sh
npm install --save-dev @kawapress/plugin-code-block
```

`pnpm add --save-dev @kawapress/plugin-code-block` and `yarn add --dev @kawapress/plugin-code-block` work too.

## Usage

```ts
import codeBlockPlugin from '@kawapress/plugin-code-block'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    codeBlockPlugin({ lineNumbers: true }),
  ],
})
```

It works on code that a highlighter such as `@kawapress/plugin-shiki` has already rendered.

## Options

| Option | Description |
| --- | --- |
| `lineNumbers` | Show line numbers on every block unless it opts out. Default off. |
| `languageLabels` | Override the visible name of a language. |
| `copyLabels` | Override the copy button texts for every language. |
| `localeCopyLabels` | Override the copy button texts for one language. |

## Documentation

[Documentation](https://kawapress.dev/en/guide/markdown-extensions) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
