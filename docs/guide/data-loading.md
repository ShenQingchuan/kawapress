---
title: 构建时数据加载
description: 在构建阶段读取远程数据或本地文件，并在 Markdown 和 Vue 组件中使用结果。
---

<script setup lang="ts">
import { data as demo } from './data-loading.data.ts'
</script>

# 构建时数据加载

有些内容不适合直接写进 Markdown。例如版本列表来自接口，文章目录来自很多本地文件。KawaPress 可以在构建阶段先读取这些数据，再把结果交给页面。

Data Loader 只在 Node.js 中运行。它的代码和 Node.js 依赖不会送到浏览器；`load()` 返回的结果会变成 JSON，进入使用它的页面包。

## 基本用法

创建一个以 `.data.ts` 或 `.data.js` 结尾的文件：

```ts
// example.data.ts
export default {
  load() {
    return {
      hello: 'world',
    }
  },
}
```

然后在 Markdown 或 Vue 组件中导入 KawaPress 生成的 `data`：

```md
<script setup lang="ts">
import { data } from './example.data.ts'
</script>

<pre>{{ data }}</pre>
```

Loader 文件本身没有声明这个 `data`。KawaPress 会执行默认导出的 `load()`，再自动生成 `data` 具名导出。

本站也在使用这项能力：本次构建读取到了 **{{ demo.pageCount }}** 篇中英文指南页面。

## 加载远程数据

`load()` 可以是异步函数。Node.js 22 已经提供 `fetch()`：

```ts
// releases.data.ts
export default {
  async load() {
    const response = await fetch('https://api.example.com/releases')
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }
    return response.json()
  },
}
```

这段请求在开发或构建时执行，不会在访客的浏览器中重复发送。一次构建里的 SSR 和浏览器包会共用同一份结果。

## 监听本地文件

要根据本地文件生成数据，可以添加 `watch`。路径相对于 Loader 文件，支持 glob：

```ts
// catalog.data.ts
import { readFile } from 'node:fs/promises'

export default {
  watch: './catalog/*.json',
  async load(files: string[]) {
    return Promise.all(files.map(async file => ({
      file,
      value: JSON.parse(await readFile(file, 'utf8')),
    })))
  },
}
```

`files` 是按路径排序的绝对路径。开发时，匹配文件的新增、修改和删除会重新生成数据并触发热更新。Loader 自己导入的本地辅助文件变化时也会更新。

## 汇总 Markdown 内容

如果要制作文章归档或 API 索引，可以使用 `createContentLoader()`：

```ts
// posts.data.ts
import { createContentLoader } from 'kawapress'

export default createContentLoader('posts/*.md')
```

Glob 相对于站点 `srcDir`。只有 Markdown 文件会被读取。默认结果包含：

```ts
interface ContentData {
  // 不含部署 base 的 KawaPress 路由
  url: string
  frontmatter: Record<string, unknown>
  src?: string
  html?: string
  excerpt?: string
}
```

`index.md` 会得到目录路由，例如 `posts/index.md` 的 `url` 是 `/posts`。在 Vue 模板中优先使用 `<RouterLink :to="post.url">`，它会自动处理站点 `base`。

可以按需增加数据，再用 `transform` 缩小最终发送到页面的内容：

```ts
// posts.data.ts
import { createContentLoader } from 'kawapress'

export default createContentLoader('posts/*.md', {
  includeSrc: true,
  render: true,
  excerpt: true,
  async transform(pages) {
    return pages
      .filter(page => page.frontmatter.draft !== true)
      .map(page => ({
        title: page.frontmatter.title,
        url: page.url,
        excerpt: page.excerpt,
      }))
  },
})
```

| 选项 | 作用 |
| --- | --- |
| `includeSrc` | 加入原始 Markdown。 |
| `render` | 使用当前 KawaPress Markdown 管线加入整页 HTML。 |
| `excerpt` | 加入已渲染摘要；`true` 使用 `---` 分隔，也可以传自定义分隔符或提取函数。 |
| `transform` | 筛选、排序或改写最终数据，可以异步。 |
| `globOptions` | 调整 `dot`、`ignore` 等文件匹配选项。 |

这些字段会进入 JavaScript 包，请只保留页面真正需要的数据。`html` 和 `excerpt` 应只来自你信任的 Markdown；不要把不可信内容直接交给 `v-html`。

## 为 Loader 标注类型

`defineLoader()` 会检查 Loader 结构。手动声明 `data` 后，导入它的页面也能得到准确类型：

```ts
// posts.data.ts
import { defineLoader } from 'kawapress'

export interface Data {
  posts: Array<{
    title: string
    url: string
  }>
}

declare const data: Data
export { data }

export default defineLoader({
  async load(): Promise<Data> {
    return { posts: [] }
  },
})
```

## 读取站点配置

Loader 执行时可以从 `globalThis.KAWAPRESS_CONFIG` 读取当前配置：

```ts
export default {
  load() {
    const config = globalThis.KAWAPRESS_CONFIG
    return {
      base: config?.site.base,
      sourceRoot: config?.srcDir,
    }
  },
}
```

`root`、`srcDir` 和 `publicDir` 都是绝对路径；`site` 是会进入网站运行侧的站点数据。这个全局值只用于 Data Loader 的 Node.js 执行阶段。

## 数据边界

Loader 结果必须是不会变形的标准 JSON：`null`、布尔值、有限数字、字符串、数组和普通对象。不要返回 `undefined`、`Date`、`Map`、`Set`、函数、类实例、循环引用或 Vue ref。KawaPress 会指出 Loader 文件和出错字段，不会让 `JSON.stringify()` 悄悄删除数据。

Data Loader 只给已存在的页面提供数据。它不会创建路由，也不是 Content Layer；需要展示的页面仍由 Markdown 文件决定。
