---
description: 在 Markdown、Vue 组件和 CSS 中引用资源，并使用公共资源目录提供下载文件和站点图标。
---

# 静态资源处理

## 引用静态资源

每篇 Markdown 都会编译成 Vue 组件，再交给 Vite 处理。页面自己的图片，应该使用相对路径：

```md
![架构图](./architecture.png)
```

常见的图片、音视频和字体文件会自动被当作资源处理。它们可以出现在 Markdown、Vue 组件和 CSS 中；静态 `src`、CSS `url(...)` 和直接 `import` 都可以使用相对路径。

生产构建时，实际被引用的资源会复制到输出目录，并使用带内容哈希的文件名。没有被引用的资源不会复制；很小的资源可能直接内联。

### 链接到的文件不是资源

普通链接只是一个地址，不会自动把目标文件加入构建结果：

```md
[下载使用手册](./handbook.pdf)
```

PDF、压缩包和其他下载文件，请放进[公共资源目录](#public-directory)。

## 公共资源目录：`public` {#public-directory}

公共资源目录放网站共用的文件，例如 `robots.txt`、网站图标、PWA 图标和下载文件。

默认目录名是 `public`，位于 `srcDir` 中。没有设置 `srcDir` 时，目录就是：

```text
docs/
└─ public/
   └─ handbook.pdf
```

公共资源目录也可以通过 `publicDir` 配置：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  srcDir: 'content',
  publicDir: 'static',
})
```

上面的文件位置是 `content/static/handbook.pdf`。`publicDir` 也可以是 `assets/public` 这样的子目录；不配置时始终使用 `public`。

目录里的文件会直接复制到输出目录根部，文件名不会改变，也不会被当成页面。

引用公共资源时，始终从网站根路径开始：

```md
[下载使用手册](/handbook.pdf)

![站点图标](/icon.svg)
```

无论磁盘目录叫 `public` 还是 `static`，页面里的地址都保持 `/handbook.pdf`。

## `base`

如果站点部署在子路径，例如 `https://example.com/kawapress/`，配置 `base: '/kawapress/'`。KawaPress 会自动处理静态资源地址。

因此，公共资源仍然这样写：

```md
![站点图标](/icon.svg)
```

不需要写成 `/kawapress/icon.svg`。

动态地址不会被自动改写。例如，主题配置中的 logo 地址需要使用 `withBase()`：

```vue
<script setup lang="ts">
import { useSite, withBase } from 'kawapress/client'

const site = useSite()
const logoPath = '/brand/logo.svg'
</script>

<template>
  <img :src="withBase(logoPath, site.base)" alt="品牌标志">
</template>
```

`withBase()` 会补上部署路径。需要在一组本地资源中动态选择时，使用 Vite 的 `import` 或 `import.meta.glob()`。

更多资源格式和动态导入规则，见 [Vite 静态资源处理文档](https://cn.vite.dev/guide/assets.html)。
