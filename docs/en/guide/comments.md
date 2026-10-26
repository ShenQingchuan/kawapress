---
title: Comments
description: Host the discussion of every page in GitHub Discussions and show it with Giscus.
---

# Comments

Readers often finish a page with one more question or one more detail to add. This plugin puts that conversation under the page, and keeps the messages in GitHub Discussions, so the site needs no database and no login system of its own.

Under the hood it uses [Giscus](https://giscus.app), which renders a GitHub Discussions category as an iframe. Anyone who writes a comment signs in with their own GitHub account.

## Prepare a repository {#prepare-the-repository}

1. Pick a public GitHub repository for the comments. It does not have to be the repository that holds your docs.
2. In the repository, open **Settings → General → Features** and turn on **Discussions**.
3. Create a category in **Discussions**, for example `Comments`. The **Announcements** type works well: only maintainers can start a discussion, everyone can reply.
4. Install the [giscus app](https://github.com/apps/giscus) and give it access to that repository.

## Copy the four ids {#copy-the-four-ids}

Open [giscus.app](https://giscus.app) and enter `your-name/your-repo` under **Repository**. The site then shows a ready-made snippet like this one:

```html
<script
  src="https://giscus.app/client.js"
  data-repo="your-name/your-repo"
  data-repo-id="R_kgDOxxxxxxx"
  data-category="Comments"
  data-category-id="DIC_kwDOxxxxxxx"
  data-mapping="pathname"
  ...
></script>
```

The plugin needs exactly four of those values:

| Option | Where it comes from |
| --- | --- |
| `repo` | `data-repo`, for example `your-name/your-repo` |
| `repoId` | `data-repo-id` |
| `category` | `data-category`, the name of the discussion category |
| `categoryId` | `data-category-id` |

`repoId` and `categoryId` are not the repository address and not the category name. giscus uses them to find the exact discussion list, so copy them as they are.

## Enable the plugin {#enable-the-plugin}

```sh
pnpm add --save-dev @kawapress/plugin-comments
```

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

Build the site again and every documentation page ends with a comment section. When one of the four ids is missing, the build stops and names the empty option.

## Options {#options}

Everything except the four ids can be left out:

| Option | Default | What it does |
| --- | --- | --- |
| `mapping` | `'pathname'` | How a page is matched to a discussion: `pathname`, `url`, `title`, or `og:title`. |
| `strict` | `false` | Match only discussions whose title equals the mapping value exactly. |
| `reactionsEnabled` | `true` | Show the reaction bar above the thread. |
| `inputPosition` | `'bottom'` | Put the comment box above (`'top'`) or below (`'bottom'`) the thread. |
| `loading` | `'lazy'` | How the iframe loads: `'lazy'` or `'eager'`. |

`mapping` decides which discussion belongs to which page. The default `pathname` uses the page path as the key, which suits most sites. The `specific` and `number` mappings need a discussion number written into every page, so this plugin does not support them yet and says so when you configure them.

### Change the heading {#customize-the-heading}

The heading follows the site language: "评论" on Chinese sites and "Comments" everywhere else. Use `labels` to change it for every language, or `localeLabels` for one language:

```ts
commentsPlugin({
  giscus: { repo, repoId, category, categoryId },
  labels: { heading: 'Discussion' },
  localeLabels: {
    en: { heading: 'Reader notes' },
  },
})
```

Keys of `localeLabels` are the locale keys from your `locales` configuration, where `root` is the default locale.

## Turn comments off for one page {#turn-comments-off-for-one-page}

Add `comments: false` to the frontmatter of a page to leave the section out of it:

```md
---
title: Changelog
comments: false
---
```

## What happens in the browser {#what-happens-in-the-browser}

- The build writes only a heading and an empty container into the page, so comments never grow the HTML that every reader downloads.
- `https://giscus.app/client.js` is requested once the section gets within 200 pixels below the viewport. A reader who only skims the article pays nothing for the comment area.
- Switching the site between light and dark appearance switches the thread as well, without reloading it.
- Moving to another page builds a fresh thread for that page, so the discussion always belongs to the page you are reading.
- The interface language follows `lang` in your `locales` configuration: `zh-CN` for Chinese, `en` for everything else.
- The `doc.after` outlet only exists in the documentation layout, so home and plain pages never show a comment section.

## Limitations {#limitations}

- The thread is a third-party script, so the reader's browser must be able to reach `giscus.app`. Where that is blocked, the article still renders, only the thread is missing.
- The plugin does not count comments. Use the GitHub API for that.
- When a page turns comments off, the container disappears instead of leaving an empty gap.
