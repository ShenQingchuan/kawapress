---
description: 说明如何在 Markdown、Vue 组件和 CSS 中引用静态资源，以及 public 目录和 base 的工作方式。
---

# 静态资源处理

图片、视频、字体、下载文件这类不需要编译成页面的内容，统称为静态资源。KawaPress 把它们交给 Vite 处理，所以日常写法很简单：**页面旁边的资源用相对路径；需要保留原文件名的资源放进 `public`。**

## 引用页面旁边的资源

每篇 Markdown 页面都会编译成 Vue 单文件组件。Markdown、Vue 组件和 CSS 中的静态资源引用，都会由 Vite 自动发现。

假设目录是：

```text
docs/
└─ guide/
   ├─ asset-handling.md
   └─ architecture.png
```

在 `asset-handling.md` 中直接写相对路径：

```md
![架构图](./architecture.png)
```

生产构建时，Vite 会按需复制这张图片，通常生成带内容哈希的文件名。这样浏览器能更可靠地缓存更新后的资源；很小的资源也可能直接内联到页面里。无论哪种情况，KawaPress 都会处理好站点的 `base` 路径。

同一条规则也适用于 Vue 组件和 CSS：静态 `src`、`url(...)`，或在脚本中直接 `import` 的资源，都使用相对于当前文件的路径。

::: tip 先选相对路径
图片确实属于某篇文档或某个组件时，把它放在旁边并使用 `./` 或 `../`。移动目录时，资源和内容能一起移动，关系更清楚。
:::

## `public` 目录

有些文件不被某个页面直接引用，或者必须保持原始文件名。比如 `robots.txt`、favicon、PWA 图标、PDF 下载文件。这些文件放进 `public`。

`public` 位于内容源目录中：

```text
# 默认：srcDir 是站点根目录
docs/
└─ public/
   └─ handbook.pdf

# 配置了 srcDir: 'content'
docs/
└─ content/
   └─ public/
      └─ handbook.pdf
```

构建时，`public` 里的文件会原样复制到输出目录根部，不会生成内容哈希，也不会被当成 Markdown 页面。

在 Markdown 中，从站点根路径引用它们：

```md
[下载使用手册](/handbook.pdf)

![站点图标](/icon.svg)
```

这里的 `/` 指向站点公开根目录，**不是**磁盘根目录。即使站点部署在 `/kawapress/` 这样的子路径下，也不要手动写成 `/kawapress/handbook.pdf`；KawaPress 会自动加上 `base`。

::: warning 下载文件要放进 `public`
普通链接，例如 `[PDF](./handbook.pdf)`，不会让 Vite 把该文件当作页面资源收集。需要对外提供的 PDF、压缩包或其他下载文件，请放入 `public`，再使用 `/handbook.pdf` 这类路径链接。
:::

## 动态资源 URL

Vite 只能在构建时处理能看见的静态路径。下面这种运行时从主题配置读取的路径，不会自动改写：

```vue
<script setup lang="ts">
import { useSite, withBase } from 'kawapress/client'
import { computed } from 'vue'

const site = useSite()
const logoSrc = computed(() => (
  withBase('/brand/logo.svg', site.value.base)
))
</script>

<template>
  <img :src="logoSrc" alt="品牌标志">
</template>
```

这类文件应放在 `public/brand/logo.svg`。只写 `/brand/logo.svg`，再使用 `withBase()`；不要自己拼接部署路径。这样本地根路径开发和 GitHub Pages 等子路径部署都会正确。

如果需要在一组构建期已知的本地资源之间动态选择，优先使用 Vite 的标准 `import` 或 `import.meta.glob()`。`new URL()` 的路径同样必须能在构建时确定，并且不适合作为会在 KawaPress SSR 中执行的通用方案。KawaPress 不额外包一层私有资源 API。

## 快速选择

| 你的情况 | 放在哪里 | 怎么引用 |
| --- | --- | --- |
| 某一页专用的插图 | Markdown 文件旁边 | `![说明](./image.png)` |
| Vue 组件专用的图片或字体 | 组件旁边 | 静态 `src`、CSS `url(...)` 或 `import` |
| 固定文件名的图标、PDF、`robots.txt` | `srcDir/public/` | `/icon.svg`、`/handbook.pdf` |
| 从配置或运行时数据得到的公开 URL | `srcDir/public/` | `withBase('/logo.svg', site.base)` |

想了解 Vite 对资源格式、内联阈值和动态导入的完整规则，可以继续阅读 [Vite 静态资源处理文档](https://cn.vite.dev/guide/assets.html)。
