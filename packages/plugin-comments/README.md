# @kawapress/plugin-comments

GitHub Discussions comments for KawaPress, powered by Giscus.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-comments?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-comments) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-comments/README.zh-CN.md)

`@kawapress/plugin-comments` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Comments live in GitHub Discussions, so the site needs no database and no login system.
- The build writes only a heading and an empty container. The Giscus script loads when the section is about to scroll into view.
- The thread follows the site light and dark appearance, and the interface language of the site.
- Moving to another page builds a fresh thread for it.
- Turn comments off for one page with `comments: false`.

## Install

```sh
npm install --save-dev @kawapress/plugin-comments
```

`pnpm add --save-dev @kawapress/plugin-comments` and `yarn add --dev @kawapress/plugin-comments` work too.

## Usage

Prepare a public repository with Discussions turned on, install the [giscus app](https://github.com/apps/giscus), then copy the four values from [giscus.app](https://giscus.app):

```ts
import commentsPlugin from '@kawapress/plugin-comments'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    commentsPlugin({
      giscus: {
        repo: 'your-name/your-repo',
        repoId: 'R_kgDOxxxxxxx',
        category: 'Comments',
        categoryId: 'DIC_kwDOxxxxxxx',
      },
    }),
  ],
})
```

The build stops and names the empty option when one of the four values is missing.

## Options

| Option | Description |
| --- | --- |
| `giscus.repo / repoId / category / categoryId` | The four values from giscus.app. All are required. |
| `mapping` | How a page maps to a discussion. Default `pathname`. |
| `strict` | Match only discussions whose title equals the mapping value. Default off. |
| `reactionsEnabled` | Show the reaction bar. Default on. |
| `inputPosition` | `top` or `bottom`. Default `bottom`. |
| `loading` | `lazy` (default) or `eager`. |
| `labels / localeLabels` | Change the heading for every language, or for one. |

## Documentation

[Documentation](https://kawapress.dev/en/plugins/comments) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
