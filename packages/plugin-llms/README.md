# @kawapress/plugin-llms

AI-ready output for KawaPress: a Markdown file for every page, plus llms.txt and llms-full.txt.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-llms?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-llms) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-llms/README.zh-CN.md)

`@kawapress/plugin-llms` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Writes a `.md` file next to every page, for example `/guide/start` becomes `/guide/start.md`.
- Writes `llms.txt` and `llms-full.txt` for each language.
- Adds a "copy page" button under the page title.
- Converts the rendered page, so Vue components come out as readable Markdown. `SsgMarkdown` lets a component supply its own Markdown.

## Install

This package is already included in `kawapress`. A site that uses `kawapress/nagi` has it, so there is nothing to install.

Install it yourself only when you build a site without the nagi preset.

```sh
npm install --save-dev @kawapress/plugin-llms
```

`pnpm add --save-dev @kawapress/plugin-llms` and `yarn add --dev @kawapress/plugin-llms` work too.

## Usage

```ts
import llmsPlugin from '@kawapress/plugin-llms'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    llmsPlugin({ description: 'Documentation for My Project' }),
  ],
})
```

With nagi, set it under `llms` instead: `nagi({ llms: { description: '…' } })`.

## Options

| Option | Description |
| --- | --- |
| `description` | The summary at the top of `llms.txt`. A string, or an object keyed by locale. |
| `llmsTxt` | A function that receives the pages and the default text, and returns your own `llms.txt`. |

## Documentation

[Documentation](https://kawapress.dev/en/guide/ai-ready-documentation) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
