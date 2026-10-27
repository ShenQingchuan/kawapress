---
title: Frontmatter
description: 在页面开头设置标题、描述、布局和其他页面数据。
---

# Frontmatter

Frontmatter 是写在 Markdown 文件最开头的一小段设置。它不会显示在正文里，可以设置标题、描述、布局，或保存自己的数据。

## 写 Frontmatter {#write-frontmatter}

最常用的是 YAML。用三条横线包住数据，并且放在页面任何内容之前：

```md
---
title: 快速开始
description: 用几分钟创建第一个 KawaPress 站点。
---

# 快速开始
```

也可以使用 JSON 对象：

```md
{
  "title": "快速开始",
  "description": "用几分钟创建第一个 KawaPress 站点。"
}

# 快速开始
```

这些内容会跟随页面一起使用，所以请只写简单的数据：文字、数字、`true` 或 `false`、`null`、列表和普通对象。

## 使用自己的数据 {#use-your-own-data}

除了下面会用到的字段，你还可以保存自己的页面数据。通过 `usePageData()` 读取当前页面：

```md
---
status: beta
---

<script setup lang="ts">
import { usePageData } from 'kawapress/client'

const page = usePageData()
</script>

当前状态：{{ page?.frontmatter.status }}
```

`usePageData()` 会在站内跳转时更新。它只读取正在打开的这一页。

## 页面标题和描述 {#page-titles-and-descriptions}

下面三个字段可以设置页面标题和简介：

| 字段 | 作用 |
| --- | --- |
| `title` | 页面标题。没有时使用第一个一级标题。 |
| `description` | 页面简介。搜索引擎和分享卡片会使用它。 |
| `titleTemplate` | 浏览器标签标题的模板。`%s` 会替换成页面标题；写 `false` 时只显示页面标题。 |

```md
---
title: 配置站点
description: 设置 KawaPress 站点的标题、路径和语言。
titleTemplate: '%s · KawaPress 指南'
---
```

上面的浏览器标签标题是“配置站点 · KawaPress 指南”。页面标题也会用于站内搜索。

`title` 没写时，页面标题取第一个一级标题的文字，并去掉 Markdown 格式：`**加粗**`、`[链接](/guide)` 只留下文字，行内代码去掉反引号；公式和行内 HTML 这类写法不是格式，会按你写的原样保留。所以标题 `# Energy $E=mc^2$` 的页面标题是 `Energy $E=mc^2$`。

## 页面 head {#page-head}

需要给某一页单独加 `<head>` 标签时，写进 frontmatter 的 `head`。它和站点配置里的 `head` 一样，每一项都是 `[标签名, 属性, 内容?]`：

```md
---
head:
  - - meta
    - property: og:image
      content: https://example.com/guide.png
---
```

上面这一项让本页的分享图片覆盖站点设置的 `og:image`。渲染顺序是站点、当前语言、当前页面，越靠后越优先。站点和语言的 `head` 怎么写，见[添加 head 标签](/guide/getting-started#add-head-tags)。

读取页面数据时，这一项就是 `page.head`。

## Nagi 页面布局 {#nagi-page-layout}

使用默认界面 nagi 时，`layout` 用来选择页面的样式和导航结构：

```md
---
layout: home
---
```

| 值 | 结果 |
| --- | --- |
| `doc` | 默认值。显示文档布局。 |
| `home` | 落地页布局，可使用 `hero` 和 `features`。 |
| `page` | 普通页面布局，不显示文档侧栏和本页目录。 |

你也可以在单个页面关闭 nagi 的某些区域：

```md
---
navbar: false
sidebar: false
outline: false
footer: false
pageClass: focused-page
---
```

| 字段 | 作用 |
| --- | --- |
| `navbar: false` | 隐藏顶部导航。 |
| `sidebar: false` | 隐藏当前文档页的侧栏和菜单，但页面仍保留在站点目录中。 |
| `aside: false` | 隐藏宽屏右侧的本页目录。 |
| `outline: false` | 关闭所有本页目录，包括小屏幕的目录按钮。 |
| `footer: false` | 在 `home` 或 `page` 页面隐藏页脚。 |
| `pageClass` | 给页面最外层添加一个 CSS class，方便写自己的样式。 |

`hero` 和 `features` 的写法见[快速开始](/guide/getting-started)。

## 从搜索中排除页面 {#exclude-a-page-from-search}

不想让页面进入默认本地搜索时，写：

```md
---
search: false
---
```

只有直接写 `false` 才会排除页面。

## 从站点地图中排除页面 {#exclude-a-page-from-sitemap}

不希望页面出现在 `sitemap.xml` 中时，写：

```md
---
sitemap: false
---
```

只有直接写 `false` 才会排除页面。站点地图的其他设置见[站点地图](/guide/sitemap)。
