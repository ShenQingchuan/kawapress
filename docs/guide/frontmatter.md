---
title: Frontmatter
description: 在页面开头设置标题、描述、布局和其他页面数据。
---

# Frontmatter

Frontmatter 是写在 Markdown 文件最开头的一小段页面数据。它不显示在正文里，可以设置标题、描述、布局，或保存自己的数据。

## 写 Frontmatter

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

Frontmatter 里的值会跟随页面进入浏览器，所以只能使用 JSON 能表示的值：字符串、数字、布尔值、`null`、数组和普通对象。

## 使用自己的数据

除了 KawaPress 和主题认识的字段，你可以保存任意页面数据。通过 `usePageData()` 读取当前页面：

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

`usePageData()` 会在站内跳转时更新。它只提供当前页面，不会把全站内容发送到浏览器。

## 页面标题和描述

Core 会识别下面三个字段：

| 字段 | 作用 |
| --- | --- |
| `title` | 页面标题。没有时使用第一个一级标题。 |
| `description` | 写入页面的 description meta，供搜索引擎和分享预览使用。 |
| `titleTemplate` | 浏览器标题的模板。`%s` 会替换成页面标题；写 `false` 时只显示页面标题。 |

```md
---
title: 配置站点
description: 设置 KawaPress 站点的标题、路径和语言。
titleTemplate: '%s · KawaPress 指南'
---
```

上面的页面浏览器标题是“配置站点 · KawaPress 指南”。页面标题也会用于本地搜索。

## Nagi 页面布局

使用默认 nagi Preset 时，`layout` 决定页面外壳：

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
| `pageClass` | 为 nagi 页面外壳添加一个 CSS class。 |

`hero` 和 `features` 的写法见[快速开始](/guide/getting-started)。

## 从搜索中排除页面

不想让页面进入默认本地搜索时，写：

```md
---
search: false
---
```

只有布尔值 `false` 会排除页面。

## 当前不支持的字段

KawaPress 0.1 不会把 `head`、`editLink`、`lastUpdated`、`prev` 或 `next` 解释成页面功能。它们可以作为你的自定义数据保存，但不会改变默认行为。
