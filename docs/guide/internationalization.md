---
title: 国际化
description: 使用目录和 locales 配置组织多语言文档站。
---

# 国际化

KawaPress 根据 URL 选择语言。把默认语言放在根目录，其他语言放进各自的子目录。使用默认 nagi 界面时，站点会自动显示语言切换菜单。

## 放置不同语言的页面 {#add-pages-for-each-language}

下面的站点以中文为默认语言，并提供英文：

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

同一篇文档在不同语言下应使用相同的相对路径：

| Markdown 文件 | 页面地址 |
| --- | --- |
| `guide/getting-started.md` | `/guide/getting-started` |
| `en/guide/getting-started.md` | `/en/guide/getting-started` |

根目录就是默认语言，不需要额外的语言前缀。`en` 这样的目录名会成为 URL 的第一段。

## 配置语言 {#configure-languages}

在 `kawapress.config.ts` 中写出每种语言：

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

`root` 表示默认语言。其他键会成为语言目录名，因此上面的 `en` 对应 `/en/`。

| 字段 | 作用 |
| --- | --- |
| `label` | 语言菜单里显示的名称。 |
| `lang` | 页面语言，例如 `zh-CN` 或 `en`。nagi 会据此使用中文或英文的内置界面文字。 |
| `title` | 只用于这一种语言的站点标题。 |
| `head` | 只用于这一种语言的 `<head>` 标签，写法见[添加 head 标签](/guide/getting-started#add-head-tags)。 |
| `link` | 选择这种语言时打开的地址。不填写时，默认使用它的语言目录；也可以填写另一个站点的地址。 |
| `themeConfig` | 只用于这一种语言的界面配置。它会和全站配置合并；同名字段会被这里的值替换。 |
| `dir` | 文字方向，可写 `ltr` 或 `rtl`。 |

## 切换到对应页面 {#switch-between-matching-pages}

语言菜单会尽量跳到另一种语言中的同一篇文档，并保留查询参数和标题锚点：

```text
/guide/getting-started?tab=install#first-step
→ /en/guide/getting-started?tab=install#first-step
```

因此，请为每种语言保持相同的目录和文件名。KawaPress 不会翻译页面，也不会在目标页面缺失时自动寻找别的内容；缺少对应文件时，链接会进入未找到页面。默认站内搜索也只显示当前语言的结果。

## 默认语言与自动跳转 {#default-language-and-redirects}

`/` 始终是默认语言的首页。KawaPress 不会根据浏览器语言自动跳转，也不会记住读者上次选择的语言；读者可以随时从语言菜单切换。

## 本地化侧边栏 {#localize-the-sidebar}

每种语言可以有自己的 `themeConfig`。使用 nagi 时，`defineLocalizedSidebars()` 可以让你只写一份路径结构：

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

然后把每种语言的侧边栏放进对应配置：

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

链接只需要写默认语言的路径。helper 会为英文侧边栏自动加上 `/en`。

## 顶部导航与分区侧边栏 {#top-navigation-and-sections}

文档变多以后，可以把站点分成几个分区，例如「指南」和「插件」。在顶部放分区链接，让每个分区有自己的侧边栏。

用 `themeConfig.nav` 配置顶部链接：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started', activeMatch: '/guide' },
      { text: '插件', link: '/plugins/overview', activeMatch: '/plugins' },
    ],
  },
})
```

每一项有三个字段：

| 字段 | 说明 |
| --- | --- |
| `text` | 链接上显示的文字。 |
| `link` | 点击后打开的页面，写不带语言前缀以外的站点路径，例如 `/guide/getting-started`。 |
| `activeMatch` | 可选。路径前缀，当前页面在这个前缀之下时，这一项会高亮。不写时只在 `link` 本身这一页高亮。 |

上面的「指南」写了 `activeMatch: '/guide'`，所以读者在 `/guide/` 下的任何页面，这一项都是高亮的，而不只是在「快速开始」这一页。

窄屏幕上，这些链接不会挤在顶部，而是出现在点开菜单按钮后展开的区域里，排在语言列表前面。

### 让每个分区有自己的侧边栏 {#sidebar-per-section}

`sidebar` 可以写成「路径前缀 → 侧边栏」的对象，当前页面在哪个前缀之下，就显示哪个侧边栏：

```ts
export default nagi({
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started', activeMatch: '/guide' },
      { text: '插件', link: '/plugins/overview', activeMatch: '/plugins' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '介绍',
          items: [{ text: '快速开始', link: '/guide/getting-started' }],
        },
      ],
      '/plugins/': [
        {
          text: '官方插件',
          items: [{ text: '概览', link: '/plugins/overview' }],
        },
      ],
    },
  },
})
```

当前页面没有命中任何前缀时，nagi 会改用根据目录自动生成的侧边栏。首页的 `layout` 是 `home`，本来就不显示侧边栏。

### 每种语言各写各的 {#per-locale-navigation}

`nav` 和 `sidebar` 都是主题配置，所以每种语言可以覆盖它们。把链接指向各自语言下的页面即可：

```ts
export default nagi({
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started', activeMatch: '/guide' },
    ],
  },
  locales: {
    root: { label: '简体中文', lang: 'zh-CN' },
    en: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/getting-started', activeMatch: '/en/guide' },
        ],
      },
    },
  },
})
```

导航区域的无障碍名称默认是「主导航」，可以用 `navLinksLabel` 修改。

## 从右向左书写 {#right-to-left-languages}

阿拉伯语、希伯来语等从右向左书写的语言，可以设置 `dir: 'rtl'`：

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

KawaPress 会把这个方向写到页面的 `<html>` 标签上。它不会自动把从左到右设计的界面完整翻转；请检查并按需要调整自己的样式。
