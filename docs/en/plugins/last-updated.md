---
title: Last Updated
description: Show when a page was last changed and where to edit it, using the last git commit of its Markdown file.
---

# Last Updated

`@kawapress/plugin-last-updated` adds one short line at the end of every page: when the content last changed, plus a link to edit it. The date comes from the last git commit that touched the Markdown file, so nobody has to keep it up to date by hand.

Readers see something like this:

```text
Edit this page    Last updated: Oct 26, 2026, 11:55 AM
```

## Install and Enable {#install-and-enable}

::: code-group
```sh [npm]
npm install --save-dev @kawapress/plugin-last-updated
```

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-last-updated
```

```sh [Yarn]
yarn add --dev @kawapress/plugin-last-updated
```
:::

Add the plugin to `kawapress.config.ts`:

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

The line is placed in the `doc.footer` outlet, so the theme decides where it appears. The nagi theme already renders that outlet, which is why the configuration above works right away. In your own theme, put `<KawaOutlet name="doc.footer" />` in the `Layout`. When no page renders the outlet, the build prints a warning.

## The Edit Link {#edit-link}

`editLink.pattern` is a URL template. `:path` is replaced by the path of the file inside the repository, for example `docs/guide/intro.md`. The path has no leading slash, so the template usually reads `.../edit/main/:path`.

```ts
lastUpdatedPlugin({
  editLink: {
    pattern: 'https://github.com/your-name/your-repo/edit/main/:path',
    text: 'Improve on GitHub',
  },
})
```

- `pattern` must contain `:path`. Otherwise the plugin fails on startup, because the link could not point at the file.
- `text` is the link text. It overrides the built-in “Edit this page”; use `labels` below when each language needs its own wording.
- The repository path comes from `git rev-parse --show-toplevel`. When the site is not inside a git repository, the link is skipped and one warning is printed.

## Format the Date {#format-options}

The default is a medium-length date and a short time. Pass anything `Intl.DateTimeFormat` accepts to change it:

```ts
lastUpdatedPlugin({
  lastUpdated: {
    formatOptions: { year: 'numeric', month: 'long', day: 'numeric' },
  },
})
```

When the options describe single fields such as year, month, and day, the plugin no longer adds the default date and time styles, because `Intl.DateTimeFormat` does not allow both at once.

One thing is worth knowing about time zones. The page is rendered on the server in UTC, and the browser reformats the date in the visitor's zone once it loads, so people read the time they expect. To pin one zone for the whole site, set `timeZone` yourself:

```ts
lastUpdatedPlugin({
  lastUpdated: {
    formatOptions: { timeZone: 'Asia/Shanghai' },
  },
})
```

## Change the Wording {#labels}

Two sets of text are built in: Chinese (`最后更新于` / `编辑此页`) and English (`Last updated` / `Edit this page`). The plugin picks one from the `lang` of the current page. Overrides work the same way as in `@kawapress/plugin-container`:

```ts
lastUpdatedPlugin({
  labels: {
    lastUpdated: 'Touched',
  },
  localeLabels: {
    en: {
      lastUpdated: 'Updated on',
      editLink: 'Improve this page',
    },
  },
})
```

From strongest to weakest: the current locale in `localeLabels`, then `labels`, then `editLink.text`, then the built-in text. Punctuation belongs to the language — a full-width colon in Chinese, a colon and a space in English — so an override is plain text without punctuation.

## Turn It Off for One Page {#opt-out-per-page}

Frontmatter can switch off each part on its own page:

```md
---
lastUpdated: false
editLink: false
---
```

Setting just one hides just that part. With both off, the page footer gains no extra element.

## About Git History {#git-history}

- Only git history is read, never file modification times. The two are often different.
- A new file has no date until it is committed, in development as well as in production. Run `git commit` to give it one.
- In a shallow clone the plugin prints a warning and skips the line, because an incomplete history produces wrong dates. In GitHub Actions, set `fetch-depth: 0` for `actions/checkout`.
- Outside a git repository the plugin also prints a warning and skips both the date and the edit link.

## Use the Data in Your Own Component {#use-in-a-custom-component}

The plugin writes two page data fields that any component can read, so a theme can build its own footer:

```vue
<script setup lang="ts">
import type { LastUpdatedPageData } from '@kawapress/plugin-last-updated'
import { usePageData } from 'kawapress/client'
import { computed } from 'vue'

const page = usePageData()
const lastUpdated = computed(
  () => (page.value as LastUpdatedPageData | undefined)?.lastUpdated,
)
</script>
```

`lastUpdated` is a millisecond timestamp and `editLink` is the finished URL. Either one may be missing, so check before you show it.
