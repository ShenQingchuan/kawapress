# @kawapress/plugin-last-updated

A last updated time and an edit link at the bottom of every KawaPress page.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-last-updated?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-last-updated) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-last-updated/README-zh-CN.md)

`@kawapress/plugin-last-updated` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- The time comes from the last git commit of the Markdown file, so nobody keeps it up to date by hand.
- An "Edit this page" link built from a URL template.
- The server renders in UTC and the browser reformats the time in the visitor's zone.
- Pass any `Intl.DateTimeFormat` options to change the format.
- Turn off the date or the link for one page with `lastUpdated: false` or `editLink: false`.

## Install

```sh
npm install --save-dev @kawapress/plugin-last-updated
```

`pnpm add --save-dev @kawapress/plugin-last-updated` and `yarn add --dev @kawapress/plugin-last-updated` work too.

## Usage

```ts
import lastUpdatedPlugin from '@kawapress/plugin-last-updated'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    lastUpdatedPlugin({
      editLink: {
        pattern: 'https://github.com/your-name/your-repo/edit/main/:path',
      },
    }),
  ],
})
```

In a shallow clone the plugin skips the date and prints a warning. In GitHub Actions, set `fetch-depth: 0` for `actions/checkout`.

## Options

| Option | Description |
| --- | --- |
| `editLink.pattern` | The edit address. `:path` is replaced by the file path in the repository. |
| `editLink.text` | The link text. |
| `lastUpdated.formatOptions` | Options for `Intl.DateTimeFormat`. |
| `labels` | Override the texts for every language. |
| `localeLabels` | Override the texts for one language. |

## Documentation

[Documentation](https://kawapress.dev/en/plugins/last-updated) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
