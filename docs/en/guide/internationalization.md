---
title: Internationalization
description: Organize a multilingual documentation site with directories and locales.
---

# Internationalization

KawaPress chooses a language from the URL. Keep the default language at the site root and put every other language in its own directory. Sites using the default nagi interface get a language menu automatically.

## Add Pages for Each Language

This site uses Chinese as its default language and also has English pages:

```text
.
├─ guide/
│  └─ getting-started.md
├─ en/
│  ├─ guide/
│  │  └─ getting-started.md
│  └─ index.md
└─ index.md
```

Use the same relative path for the same document in each language:

| Markdown file | Page URL |
| --- | --- |
| `guide/getting-started.md` | `/guide/getting-started` |
| `en/guide/getting-started.md` | `/en/guide/getting-started` |

The root directory is the default language, so it has no language prefix. A directory such as `en` becomes the first URL segment.

## Configure Languages

List each language in `kawapress.config.ts`:

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'My Docs',
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
    },
    en: {
      label: 'English',
      lang: 'en',
    },
  },
})
```

`root` is the default language. Every other key becomes its language directory, so `en` maps to `/en/`.

| Field | What it does |
| --- | --- |
| `label` | The name shown in the language menu. |
| `lang` | The page language, such as `zh-CN` or `en`. nagi uses it for its built-in Chinese and English interface text. |
| `title` | A site title for this language only. |
| `link` | The address to open when this language is selected. It defaults to the language directory and can point to another site. |
| `themeConfig` | Interface settings for this language only. They merge with site-wide settings, and matching fields are replaced here. |
| `dir` | The writing direction: `ltr` or `rtl`. |

## Switch Between Matching Pages

The language menu tries to open the same document in the other language. It also keeps query parameters and heading anchors:

```text
/guide/getting-started?tab=install#first-step
→ /en/guide/getting-started?tab=install#first-step
```

Keep directory and file names the same for every language. KawaPress does not translate pages or look for a fallback when a matching page is missing. A missing file leads to the not-found page. Default site search also shows results for the current language only.

## Default Language and Redirects

`/` is always the default-language home page. KawaPress does not redirect from a browser-language preference or remember a reader’s last choice. Readers can switch at any time from the language menu.

## Localize the Sidebar

Each language can have its own `themeConfig`. With nagi, `defineLocalizedSidebars()` lets you write one route structure:

```ts
// sidebar.ts
import { defineLocalizedSidebars } from 'kawapress/nagi'

export const sidebars = defineLocalizedSidebars({
  locales: {
    root: '',
    en: '/en',
  },
  items: [
    {
      text: {
        root: '指南',
        en: 'Guide',
      },
      items: [
        {
          text: {
            root: '快速开始',
            en: 'Getting Started',
          },
          link: '/guide/getting-started',
        },
      ],
    },
  ],
})
```

Use the matching sidebar in each language configuration:

```ts
// kawapress.config.ts
import { nagi } from 'kawapress/nagi'
import { sidebars } from './sidebar'

export default nagi({
  themeConfig: {
    sidebar: sidebars.root,
  },
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
    },
    en: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        sidebar: sidebars.en,
      },
    },
  },
})
```

Write links with the default-language path. The helper adds `/en` for the English sidebar.

## Right-to-Left Languages

For a right-to-left language such as Arabic or Hebrew, set `dir: 'rtl'`:

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  locales: {
    ar: {
      label: 'العربية',
      lang: 'ar',
      dir: 'rtl',
    },
  },
})
```

KawaPress writes this direction to the page’s `<html>` element. It does not fully mirror an interface designed for left-to-right languages, so check and adjust your own styles as needed.
