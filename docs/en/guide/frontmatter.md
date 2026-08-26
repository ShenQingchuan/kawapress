---
title: Frontmatter
description: Set a page title, description, layout, and other page data at the top of a Markdown file.
---

# Frontmatter

Frontmatter is a small set of settings at the very top of a Markdown file. It does not appear in the document. Use it for a title, description, layout, or your own data.

## Write Frontmatter

YAML is the usual format. Put the data between three dashes before anything else in the page:

```md
---
title: Getting started
description: Create your first KawaPress site in a few minutes.
---

# Getting started
```

A JSON object works too:

```md
{
  "title": "Getting started",
  "description": "Create your first KawaPress site in a few minutes."
}

# Getting started
```

These values travel with the page, so keep them simple: text, numbers, `true` or `false`, `null`, lists, and plain objects.

## Use Your Own Data

Alongside the fields below, you can save any page data you need. Read the current page with `usePageData()`:

```md
---
status: beta
---

<script setup lang="ts">
import { usePageData } from 'kawapress/client'

const page = usePageData()
</script>

Current status: {{ page?.frontmatter.status }}
```

`usePageData()` updates during client-side navigation. It reads only the page that is open.

## Page Titles and Descriptions

Use these three fields to set a page title and summary:

| Field | What it does |
| --- | --- |
| `title` | The page title. The first H1 is used when it is absent. |
| `description` | A short page summary for search engines and link previews. |
| `titleTemplate` | A browser-tab title template. `%s` becomes the page title; use `false` for the page title alone. |

```md
---
title: Configure your site
description: Set a KawaPress site title, path, and language.
titleTemplate: '%s · KawaPress Guide'
---
```

The browser-tab title for this page is “Configure your site · KawaPress Guide”. The page title is also used by site search.

## Nagi Page Layout

With the default nagi experience, `layout` chooses the page layout and navigation:

```md
---
layout: home
---
```

| Value | Result |
| --- | --- |
| `doc` | The default document layout. |
| `home` | A landing-page layout with `hero` and `features`. |
| `page` | A plain-page layout without the document sidebar or page outline. |

You can also turn off individual nagi regions for one page:

```md
---
navbar: false
sidebar: false
outline: false
footer: false
pageClass: focused-page
---
```

| Field | What it does |
| --- | --- |
| `navbar: false` | Hides the top navigation. |
| `sidebar: false` | Hides this document page’s sidebar and menu. The page remains in the site navigation. |
| `aside: false` | Hides the wide-screen page-outline rail. |
| `outline: false` | Hides every page outline, including the small-screen outline button. |
| `footer: false` | Hides the footer on a `home` or `page` layout. |
| `pageClass` | Adds a CSS class to the page’s outer element for your own styles. |

See [Getting Started](/en/guide/getting-started) for `hero` and `features`.

## Exclude a Page from Search

To keep a page out of the default local search, write:

```md
---
search: false
---
```

Only a literal `false` excludes a page.
