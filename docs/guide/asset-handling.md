---
description: 用简单、可靠的方式放好图片、字体、下载文件等静态资源，并理解 public 和 base。
---

# 静态资源处理

图片、视频、字体、PDF 下载文件，这些东西都属于“静态资源”。它们会跟着网站一起发布，但自己不是一篇可以阅读的页面。

你不用先记住很多规则。先记住下面两句话就够了：

1. **一篇文章或一个组件自己要用的图片，放在它旁边，用相对路径引用。**
2. **网站各处都会用到的文件，放进公共资源目录；它默认叫 `public`，也可以配置。**

KawaPress 会把这两种资源交给 Vite 处理。Vite 是负责打包网站的工具，它会帮你复制文件、整理地址，也会在网站部署到子路径时补上正确的前缀。

## 把图片放在页面旁边

假设你正在写一篇介绍架构的文章。图片只服务于这一篇文章，就可以把它们放在一起：

```text
docs/
└─ guide/
   ├─ asset-handling.md
   └─ architecture.png
```

然后在 `asset-handling.md` 里这样写：

```md
![架构图](./architecture.png)
```

`./` 的意思是“当前 Markdown 文件所在的文件夹”。所以 KawaPress 会找到同一个 `guide` 文件夹里的 `architecture.png`。

构建生产网站时，Vite 会只复制真正被页面使用的图片。大多数图片会得到一个带内容标记的新文件名，例如 `architecture-abc123.png`。你不需要手动写这个新名字，它能帮助浏览器在图片更新后拿到最新版本。非常小的资源有时会直接放进页面代码中，这也不用你处理。

不管资源最终是复制还是内联，页面里的地址都会自动适配站点的 `base`。因此，图片在本地开发能显示，部署到 GitHub Pages 之类的子路径后也能显示。

### Vue 组件和 CSS 也一样

这个习惯不只适用于 Markdown：

- Vue 组件中的静态 `src`；
- CSS 中的 `url(...)`；
- 在 `<script setup>` 里直接 `import` 的图片或字体；

都应该优先使用“相对于当前文件”的路径。资源和使用它的代码放得近一些，移动文件夹时不容易漏掉它们。

::: tip 一个简单的判断方法
如果删掉这篇文章或这个组件，图片也没有用了，就把图片放在旁边，用 `./` 或 `../` 引用。
:::

## 公共资源目录：`public`

网站图标、`robots.txt`、PWA 图标，以及读者要下载的 PDF、压缩包和示例文件，都是**公共资源**。它们不是某一篇文章或某一个组件专用，而是网站任何地方都可能要用到的文件。

这类文件默认就应该放在公共资源目录 `public` 里：

```text
docs/
└─ public/
   └─ handbook.pdf
```

构建时，KawaPress 会把这个目录里的文件放到最终网站的根目录。文件名保持不变，而且目录里的 Markdown 文件也不会被误当成页面。

### 改公共资源目录的位置

`public` 是默认名字，不是不能改的名字。使用 `publicDir` 可以把公共资源目录换成任何位于 `srcDir` 里的相对目录。

例如，内容目录是 `content`，你想把公共资源放进 `content/static`：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  srcDir: 'content',
  publicDir: 'static',
})
```

目录结构就是：

```text
docs/
└─ content/
   └─ static/
      └─ handbook.pdf
```

也可以写子目录，例如 `publicDir: 'assets/public'`。不写 `publicDir` 时，KawaPress 一直使用默认的 `public`。

### 怎么引用公共资源

不管目录在磁盘上叫 `public`、`static` 还是别的名字，页面里都从网站公开根路径开始写：

```md
[下载使用手册](/handbook.pdf)

![站点图标](/icon.svg)
```

开头的 `/` 表示“网站公开根目录”，不是电脑磁盘的根目录。

假设网站部署到 `https://example.com/kawapress/`，仍然只写 `/handbook.pdf`，**不要**写 `/kawapress/handbook.pdf`。KawaPress 会自动补上 `/kawapress/` 这个 `base` 前缀。这样，文件夹可以调整，部署位置可以改变，内容里的链接却不用跟着改。

::: warning 下载文件请用公共资源目录
写 `[PDF](./handbook.pdf)` 看起来很自然，但普通 Markdown 链接不会要求 Vite 收集并复制这个文件。读者需要下载的 PDF、压缩包和其他文件，应该先放进公共资源目录，再用 `/handbook.pdf` 这样的地址链接。
:::

## 运行时才知道的资源地址

有时图片地址不是直接写在模板里，而是来自主题配置、接口数据或一段变量。比如站点主题读到的 logo 路径是 `/brand/logo.svg`。

这时 Vite 在构建时看不到最终的完整使用位置，不能替你自动改写地址。最稳妥的做法是：

1. 把文件放进公共资源目录；默认位置是 `public/brand/logo.svg`；
2. 配置里只保存 `/brand/logo.svg`；
3. 在组件里用 `withBase()` 得到真正可访问的地址。

```vue
<script setup lang="ts">
import { useSite, withBase } from 'kawapress/client'

const site = useSite()

// 这个值也可以来自主题配置。
const logoPath = '/brand/logo.svg'
const logoSrc = withBase(logoPath, site.value.base)
</script>

<template>
  <img :src="logoSrc" alt="品牌标志">
</template>
```

`withBase()` 会在需要时补上部署路径。这样同一段代码在本地访问 `/brand/logo.svg`，部署到 `/kawapress/` 后会访问 `/kawapress/brand/logo.svg`。

如果你要在一组构建时已经确定的本地资源中做选择，优先使用 Vite 的 `import` 或 `import.meta.glob()`。它们会把可选文件明确交给构建工具。

`new URL()` 的路径也必须在构建时就能确定。KawaPress 会先在服务器上渲染页面，所以不要把 `new URL()` 当成所有 SSR 代码都能安全使用的通用方案。

## 不知道该放哪里时，看看这张表

| 你的情况 | 放在哪里 | 怎么写 |
| --- | --- | --- |
| 只给一篇文章看的插图 | Markdown 文件旁边 | `![说明](./image.png)` |
| 只给一个 Vue 组件用的图片或字体 | Vue 组件旁边 | 静态 `src`、CSS `url(...)` 或 `import` |
| 网站共用的图标、PDF、`robots.txt` | 公共资源目录（默认 `srcDir/public/`） | `/icon.svg`、`/handbook.pdf` |
| 路径来自配置或运行时数据的公共资源 | 公共资源目录（默认 `srcDir/public/`） | `withBase('/logo.svg', site.base)` |

先按这张表选择，通常就不会错。遇到少见的文件格式、资源内联大小或更复杂的动态导入，再阅读 [Vite 静态资源处理文档](https://cn.vite.dev/guide/assets.html)。
