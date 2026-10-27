---
title: 插件开发
description: 按扩展位置编写 KawaPress 插件，使用生成侧与运行侧 API 完成一个完整能力。
---

# 插件开发

本篇说明如何编写一个 KawaPress 插件。阅读前，请先了解 [插件体系](/plugins/plugin-system) 中 Generator Plugin、Runtime Plugin 与 Preset 的分工。

下面的示例都围绕一个虚构的包 `@acme/kawapress-plugin-notes`。它的各个部分分别演示一种 API，最后组合成一个完整的包。

## 从需求找到扩展位置 {#find-the-extension-point-from-the-work}

编写扩展前，先问“这项工作发生在哪里”：

| 想做的事 | 扩展位置 |
| --- | --- |
| 修改站点配置 | Generator Plugin 的 `config()` |
| 扩展 Markdown 语法 | Generator Plugin 的 `markdown()` |
| 修改每个页面的数据 | Generator Plugin 的 `pageData()` |
| 观察每个页面的构建结果 | Generator Plugin 的 `pageArtifact()` |
| 添加或调整 Vite 能力 | Generator Plugin 的 `vite()` |
| 构建结束后生成静态文件 | Generator Plugin 的 `buildArtifacts()` |
| 安装 Vue 插件或全局组件 | Runtime Plugin 的 `vueApp()` |
| 把界面放进主题预留的位置 | Runtime Plugin 的 `addToOutlet()` |
| 添加导航守卫或运行时路由行为 | Runtime Plugin 的 `router()` |
| 提供一套可以直接开始的完整体验 | Preset |

一个能力可以使用表中的多个位置，但应该作为一个插件包交付。

## 完整的包结构 {#package-layout}

一个 KawaPress 插件通常作为一个标准的 npm 包交付。如果它同时需要参与构建和在浏览器运行，建议使用以下目录结构：

```text
@acme/kawapress-plugin-notes
├─ package.json
└─ src
   ├─ index.ts           默认入口：Generator Plugin（生成侧）
   ├─ runtime-plugin.ts  运行入口：Runtime Plugin（运行侧）
   └─ NotesBadge.vue     组件与样式等资源
```

在 `package.json` 中公开这两个入口：

```json
{
  "name": "@acme/kawapress-plugin-notes",
  "type": "module",
  "version": "0.1.0",
  "license": "MIT",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./runtime-plugin": {
      "types": "./src/runtime-plugin.ts",
      "import": "./src/runtime-plugin.ts",
      "default": "./src/runtime-plugin.ts"
    }
  },
  "files": [
    "src/**/!(*.test.*)"
  ],
  "peerDependencies": {
    "kawapress": "^0.0.1"
  }
}
```

> **提示**：如果插件纯粹参与构建过程（例如仅处理 Markdown 语法或构建钩子），无需在浏览器运行，可以省去 `./runtime-plugin` 入口和 `runtime-plugin.ts`。

## 生成侧插件（Generator Plugin） {#generator-plugin}

Generator Plugin 运行在 Node.js 构建期，负责处理构建过程中的配置、Markdown 编译、页面元数据以及静态资源产物。它使用 `definePlugin()` 创建。`name` 是插件的稳定身份，应与 npm 包名一致。

### 定义生成侧插件 {#defining-generator-plugin}

插件通常导出一个工厂函数，让使用者传入选项并在内部闭包使用：

```ts
// src/index.ts
import { definePlugin } from 'kawapress'

export interface NotesPluginOptions {
  /** 描述的前缀，例如 `笔记：`。 */
  prefix?: string
}

export function notesPlugin(options: NotesPluginOptions = {}) {
  const prefix = options.prefix ?? ''

  return definePlugin({
    name: '@acme/kawapress-plugin-notes',
    setup(api) {
      // 所有的生成侧 API (api.config, api.markdown, api.pageData 等) 都在这里调用
      api.pageData((pageData) => {
        pageData.description ??= `${prefix}${pageData.title}`
      })
    },
  })
}

export default notesPlugin
```

把插件加入站点配置（`kawapress.config.ts`）：

```ts
import notesPlugin from '@acme/kawapress-plugin-notes'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    notesPlugin({ prefix: '笔记：' }),
  ],
})
```

工厂函数负责校验并整理选项，`setup(api)` 中只使用整理好的值。

### 生成侧 API 总览 {#generator-api}

生成侧提供六个方法，均在 `definePlugin` 的 `setup(api)` 中调用。同一个插件内可以按需调用一个或多个方法；多个插件按在 `plugins` 数组中的顺序串行执行。

一个典型的生成侧插件完整骨架如下：

```ts
// src/index.ts
import { definePlugin } from 'kawapress'

export default function myGeneratorPlugin() {
  return definePlugin({
    name: '@acme/kawapress-plugin-notes',
    setup(api) {
      // 1. 修改或读取站点配置
      api.config((config) => { /* ... */ })

      // 2. 扩展 Markdown 解析器
      api.markdown((markdown) => { /* ... */ })

      // 3. 增强页面元数据
      api.pageData((pageData, { file, sourcePath }) => { /* ... */ })

      // 4. 监听每个页面的产物
      api.pageArtifact((pageArtifact) => { /* ... */ })

      // 5. 注入 Vite 插件或选项
      api.vite((vite) => { /* ... */ })

      // 6. 整站构建完成后生成额外静态文件
      api.buildArtifacts(async (context) => { /* ... */ })
    },
  })
}
```

下面逐一介绍每个方法的具体用途。

### `api.config()` {#config}

`config()` 在站点配置归一化后调用。handler 接收真实的站点配置对象，可以直接读取或修改配置。

```ts
// 在 setup(api) 中：
api.config((config) => {
  config.title ??= 'My Docs'
})
```

需要知道语言、部署路径或源码目录的插件，通常在这里记下配置，留给后面的方法使用。

### `api.markdown()` {#markdown}

`markdown()` 在 Markdown 编译器创建时调用，handler 接收真实的 `MarkdownExit` 实例。

```ts
// 在 setup(api) 中：
import { useMarkdownItPlugin } from 'kawapress'
import { notePlugin } from 'markdown-it-example-note'

api.markdown((markdown) => {
  markdown.use(notePlugin)
})
```

如果 markdown-it 插件的类型与 KawaPress 不完全匹配，请使用 `useMarkdownItPlugin()`。它保留插件的参数类型，并集中处理类型兼容：

```ts
// 在 setup(api) 中：
api.markdown((markdown) => {
  useMarkdownItPlugin(markdown, notePlugin, { className: 'acme-note' })
})
```

#### 让自己的组件出现在页面上 {#page-components}

有些插件会输出自己的组件，比如图表或可交互的示例。用 `addPageComponent()` 告诉 KawaPress“这一页用到了某个组件”，它会把对应的导入写进当前页面的 SFC，Vue 就能在模板里认出这个标签：

```ts
// 在 setup(api) 中：
import { addPageComponent } from 'kawapress'

api.markdown((markdown) => {
  const renderFence = markdown.renderer.rules.fence
  markdown.renderer.rules.fence = (tokens, index, options, env, renderer) => {
    if (tokens[index].info.trim() !== 'acme-chart') {
      return renderFence(tokens, index, options, env, renderer)
    }
    addPageComponent(env, { name: 'AcmeChart', from: '@acme/chart' })
    return '<AcmeChart />'
  }
})
```

`env` 是渲染这一页时使用的那份环境对象。规则、围栏渲染器和 Shiki 高亮回调都能拿到它，把它们收到的 `env` 直接传进来就行。`name` 是模板里使用的标签名，也是生成的导入绑定名；`from` 是默认导出该组件的模块，可以写包名，也可以写绝对路径。

写 Markdown 的人不需要声明任何东西。组件只在真正用到的页面上加载，没写这个围栏的页面不会为它多下载一个字节。页面自己写的 `<script setup>` 会被保留，导入追加在同一个块里；页面只有普通 `<script>` 或者完全没有脚本时，KawaPress 会补一个 `lang` 相同的 `<script setup>`。

### `api.pageData()` {#page-data}

`pageData()` 在每个页面的 `pageData` 生成之后调用。handler 接收当前页面的可修改数据：

```ts
// 在 setup(api) 中：
api.pageData((pageData) => {
  pageData.description ??= `${pageData.title} 的笔记`
})
```

`pageData` 会被序列化给运行时使用，因此它只能包含 JSON 可表示的值：文字、数字、布尔值、`null`、数组和普通对象。`Date`、`Map`、函数和类实例都不能直接写入。例如，下面的写法会让构建失败：

```ts
// 在 setup(api) 中：
api.pageData((pageData) => {
  pageData.frontmatter.reviewedAt = new Date('2026-10-08')
})
```

请改用字符串，例如 `'2026-10-08'`，再在需要时自行解析。

handler 的第二个参数告诉你当前页面来自哪个文件：`file` 是 Markdown 源文件的绝对路径，`sourcePath` 是相对 `srcDir` 的路径，例如 `/guide/intro.md`。需要读取文件信息（比如 git 提交时间）时使用它，不要从路由反推文件名，因为 `/guide` 既可能来自 `guide.md`，也可能来自 `guide/index.md`。

```ts
// 在 setup(api) 中：
api.pageData((pageData, { file, sourcePath }) => {
  pageData.frontmatter.source = sourcePath
})
```

这两个值只在生成侧使用，不会发送到浏览器。需要在页面上显示时，像上面这样把需要的部分写进 `pageData`。

需要注意，在 `pageData()` 中修改的 `title` 只影响该页面自己的数据，不会进入用于导航的页面摘要：页面摘要描述的是作者在 Frontmatter 或第一个一级标题里写下的标题。

### 给类型加上你的字段 {#extend-types}

`pageData()` 写进去的字段，读的人也应该看到它的类型。KawaPress 把三个类型留给插件扩展：

| 类型 | 用在哪里 |
| --- | --- |
| `PageData` | `usePageData()` 和 `pageData()` 拿到的页面数据 |
| `PageFrontmatter` | 页面 Frontmatter。作者写的任意键仍然允许，类型是 `unknown` |
| `ThemeConfig` | 站点和每种语言的 `themeConfig` |

在插件包里用 `declare module 'kawapress'` 加上你的字段：

```ts
// src/index.ts
declare module 'kawapress' {
  interface PageData {
    /** 最后一次提交的时间，毫秒。 */
    lastUpdated?: number
  }

  interface PageFrontmatter {
    /** 写 `false` 可以隐藏这一页的更新时间。 */
    lastUpdated?: boolean
  }
}
```

站点 `import` 了你的插件之后，所有地方都能直接用：

```ts
const page = usePageData()
page.value?.lastUpdated // number | undefined，不需要写 as
```

几个插件各自加的字段会合并到同一个类型里。没有安装的插件，它的字段就不会出现。

写的时候注意三点：

- **字段都写成可选。** 站点可能没有安装你的插件，Frontmatter 也是作者手写的，值不一定存在。
- **类型只是编译期的帮助。** `PageFrontmatter` 里的类型描述作者「应该」怎么写，不保证运行时一定如此。读取时仍然要判断，比如 `comments !== false`。
- **只能放 JSON 可表示的值。** 理由和上面的 `pageData()` 一样。

### `api.pageArtifact()` {#page-artifact}

`pageArtifact()` 在一个页面完成 Markdown 编译和全部 `pageData()` 之后调用。handler 只能读取结果，不能修改页面的源文件、数据或路由。

```ts
// 在 setup(api) 中：
const sourcePaths = new Map<string, string>()

api.pageArtifact((artifact) => {
  sourcePaths.set(artifact.routePath, artifact.sourcePath)
})
```

如果只需要构建结束时的全部页面，请优先使用 `buildArtifacts()`。

### `api.vite()` {#vite}

`vite()` 在 Vite 配置完成基础组装后调用。handler 接收完整的 `UserConfig`，可以直接修改。

```ts
// 在 setup(api) 中：
import { someVitePlugin } from 'some-vite-plugin'

api.vite((config) => {
  config.plugins ??= []
  config.plugins.push(someVitePlugin())
})
```

KawaPress 会在创建 Vite 之前校验维持渲染所需的基本条件。插件不能通过修改 Vite 配置绕开这些条件。

#### 声明运行侧用到的依赖 {#runtime-dependencies}

运行侧代码 `import` 了某个包，就要在 `vite()` 里用 `useRuntimeDependencies()` 声明它。开发服务器会先把这些包准备好，否则第一次访问用到它们的页面时，Vite 会边加载边发现新依赖，然后把整页刷新一次；服务端渲染也会把它们一起打包，不会另外加载一份 Vue。

```ts
// 在 setup(api) 中：
import { useRuntimeDependencies } from 'kawapress/generator'

api.vite((config) => {
  useRuntimeDependencies(config, '@your-scope/plugin-name', ['some-browser-lib'])
})
```

第二个参数是真正依赖这个包的包名，通常就是你自己的插件包。站点一般只安装 `kawapress` 或某个 Preset，装不到插件内部的依赖，所以这个函数会顺着 package.json 里声明的依赖关系，算出从站点到这个包的路径，再按 Vite 的 `owner > dependency` 写法声明。只在开发时生效，不影响构建产物。

### `api.buildArtifacts()` {#build-artifacts}

`buildArtifacts()` 只在 `kawapress build` 中执行。它发生在全部 Vite 构建完成之后、HTML 预渲染之前。handler 接收全部页面和一个 `emitFile()` 函数：

```ts
// 在 setup(api) 中：
api.buildArtifacts(async ({ pages, emitFile }) => {
  const routes = pages.map(page => page.routePath)
  await emitFile('notes/routes.json', `${JSON.stringify(routes, null, 2)}\n`)
})
```

`emitFile()` 只接受输出目录内的相对路径。绝对路径、包含 `..` 的路径，以及与 `public/` 或其他插件产物同名的文件，都会直接报错。`pages` 按源文件路径排序，结果稳定。

### 按语言给出不同输出 {#localized-output}

多语言站点的插件往往要给不同语言不同的文案或文件。判断一个路由属于哪种语言时，别自己拆路径，用 `resolveLocaleIndex()`：

```ts
// 在 setup(api) 中：
import { resolveLocaleIndex, useMarkdownItPlugin } from 'kawapress'

const LABELS: Record<string, string> = {
  root: 'Note',
  zh: '说明',
}

let localeKeys = ['root']

api.config((config) => {
  localeKeys = Object.keys(config.locales ?? { root: {} })
})

api.markdown((markdown) => {
  useMarkdownItPlugin(markdown, notePlugin, {
    // '/zh/guide' 得到 'zh'，'/guide' 得到 'root'
    title: (env: { path?: string }) =>
      LABELS[resolveLocaleIndex(env.path ?? '/', localeKeys)] ?? LABELS.root,
  })
})
```

它的规则与站点本身一致：`root` 负责其他语言前缀之外的所有路径，前缀最长者优先。`/en` 只认 `/en` 和 `/en/...`，所以 `/english` 不会落到英文站；`/zh-hant` 长于 `zh`，同时配置两者时也能选对。查询串和 hash 会被忽略，`/zh/guide?tab=api` 依然是 `zh`。

这个函数是纯函数，运行侧同样可以用，从 `kawapress/client` 导入即可。

### 列出全部页面、读取页面标题 {#page-list-and-title}

想自己做导航、索引或搜索数据，先要知道站点有哪些页面。`kawapress/generator` 的 `listMarkdownPages()` 使用的规则和 KawaPress 自己完全一样：跳过以 `.` 开头的目录以及 `dist`、`node_modules`，排除 `publicDir`，按名字排序。

```ts
import { resolve } from 'node:path'
import { listMarkdownPages } from 'kawapress/generator'

let srcDir = '.'

api.config((config) => {
  srcDir = config.srcDir ?? '.'
})

api.vite((config) => {
  config.plugins ??= []
  config.plugins.push({
    name: 'your-plugin:pages',
    async configResolved(resolved) {
      // sourceRoot 是页面所在的目录；publicDir 里放的是原样复制的资源，不算页面
      const pages = await listMarkdownPages({
        sourceRoot: resolve(resolved.root, srcDir),
        publicDir: resolved.publicDir,
      })
      // 每项形如
      // { file: '/site/src/guide/intro.md', sourcePath: '/guide/intro.md', routePath: '/guide/intro' }
      console.log(pages.map(page => page.routePath))
    },
  })
})
```

每个页面的标题和 `layout` 用 `createPageSummaryReader()` 读：

```ts
import { readFile } from 'node:fs/promises'
import { createPageSummaryReader } from 'kawapress/generator'

const reader = createPageSummaryReader()
const source = await readFile(page.file, 'utf8')
const { title, layout } = reader.read(source, page.file)
```

它只解析 Markdown，不会渲染页面：`pageData()` handler 不会执行，Markdown 插件、Shiki、Twoslash、MathJax 都不参与，所以列出整站也不需要先把页面编译一遍。标题的规则和页面本身一致：Frontmatter 里写了 `title` 就用它，否则取第一个一级标题的纯文本（格式标记去掉，公式按源码原样保留）；`layout` 就是 Frontmatter 里写的那个字符串，没写就是 `undefined`。

同一个文件、同样的内容会直接用上次的结果，反复读整站很便宜。主题自动生成侧边栏时就是这样读标题的。

开发服务器把改动的文件报成绝对路径，判断它是不是页面用 `isMarkdownPage()`，换回路由路径用 `markdownFileToRoutePath()`。

## 运行侧插件（Runtime Plugin） {#runtime-plugin}

Runtime Plugin 在网站运行时工作，它的代码会被打包进入站点的客户端/SSR Vite 模块图，因此可以静态导入 `.vue` 组件、CSS 样式和常规 Vue 插件。

它与 Generator Plugin 处于同一个 npm 包中，并通过 `./runtime-plugin` 入口导出。它的 `name` 同样必须与包名一致。

### 定义运行侧插件 {#defining-runtime-plugin}

运行侧插件使用 `defineRuntimePlugin()` 定义。所有的运行侧扩展逻辑在 `setup(api)` 中执行：

```ts
// src/runtime-plugin.ts
import { defineRuntimePlugin } from 'kawapress'

export default defineRuntimePlugin({
  name: '@acme/kawapress-plugin-notes',
  setup(api) {
    // 所有的运行侧 API (api.vueApp, api.addToOutlet, api.router) 都在这里调用
  },
})
```

下面逐一介绍运行侧提供的具体能力。

### `api.vueApp()` {#vue-app}

`vueApp()` 接收真实的 Vue `App` 实例。它适合调用 `app.use()` 和注册全局组件：

```ts
// src/runtime-plugin.ts
import { defineRuntimePlugin } from 'kawapress'
import NotesBadge from './NotesBadge.vue'

export default defineRuntimePlugin({
  name: '@acme/kawapress-plugin-notes',
  setup(api) {
    api.vueApp((app) => {
      app.component('NotesBadge', NotesBadge)
    })
  },
})
```

`NotesBadge.vue` 是普通的 Vue 组件。注册后，页面中就可以按 `NotesBadge` 这个名称使用它。

### `api.addToOutlet()` {#add-to-outlet}

`addToOutlet()` 用于把插件的界面挂进主题预留的位置。

搜索按钮、文档复制按钮、评论区这些界面，属于页面框架的一部分，而不是写在 Markdown 正文里的内容。插件和主题彼此不需要直接引用，而是通过 **Outlet（插座）** 机制协作：

1. **主题负责留位置**：主题在模板的合适位置放上 `<KawaOutlet name="..." />`。
2. **插件负责送组件**：插件在 Runtime Plugin 中调用 `api.addToOutlet()`，把自己的组件插进去。

```ts
// src/runtime-plugin.ts
import { defineRuntimePlugin } from 'kawapress'
import CopyPageButton from './CopyPageButton.vue'

export default defineRuntimePlugin({
  name: '@acme/kawapress-plugin-notes',
  setup(api) {
    api.addToOutlet('doc.header', {
      id: 'copy-page',
      component: CopyPageButton,
    })
  },
})
```

#### 标准 Outlet 位置

KawaPress 约定了四个标准 Outlet：

| Outlet | 谁来放置插座 | 页面位置与用途 | 常见内容 |
| --- | --- | --- | --- |
| `header.actions` | 主题 | 页面顶部导航栏的操作区域 | 搜索按钮、GitHub 链接、暗色模式切换 |
| `doc.header` | KawaPress 自动放置 | 正文第一个 `<h1>` 标题正下方（仅正文含 H1 时出现） | 复制正文按钮、阅读时间、页面工具栏 |
| `doc.footer` | 主题 | 正文末尾与页脚之间的信息区 | 最后更新时间、编辑此页链接 |
| `doc.after` | 主题 | 整个正文区下方 | 评论区、反馈表单、上一篇/下一篇导航 |

> **提示**：除了 `doc.header` 由框架自动挂载到文章首个标题后，其余三个 Outlet 均由主题模板自由决定放在具体 DOM 结构的什么位置。

#### 插入规则与注意事项

- **命名空间与 ID**：同一个插件内 `id` 必须唯一。KawaPress 会自动拼装为 `<插件名>:<id>`，防止多个插件冲突。
- **渲染顺序**：先按 `kawapress.config.ts` 中 `plugins` 数组的插件顺序排列；同一个插件内多次调用 `addToOutlet()` 时，按调用先后顺序排列。不提供权重配置。
- **校验与告警**：Outlet 名字写错、`id` 为空或插件内重复均会直接报错。如果插件向某个 Outlet 注册了组件，但当前使用的主题完全没有渲染该 Outlet，在 `kawapress build` 时会收到警告提示。
- **提供纯逻辑支持**：如果插件希望主题能够完全定制这块 UI，建议同时导出一个 Composable（例如 `useCopyPage()`）。这样主题既可以直接用 Outlet 显示默认界面，也可以选择自行调用 Composable 重新实现组件。

### 插件样式包进 `kawa.plugin` 层 {#plugin-styles}

插件自带的默认样式请全部包在 `@layer kawa.plugin { ... }` 里，并且只读取 `--kawa-*` Token：

```css
@layer kawa.plugin {
  .acme-notes-badge {
    color: var(--kawa-c-text-2);
    border: 1px solid var(--kawa-c-border);
    border-radius: var(--kawa-radius);
  }
}
```

这样做有三个好处：主题样式不需要借助 `!important` 就能盖过插件样式；插件不写 fallback 颜色，所以任何主题下都能直接使用；更换主题时插件代码完全不用改。

不要在插件里读取某个主题的私有变量（例如 `--nagi-*`），也不要自己再定义一套通用颜色变量。真正只属于插件自己的数值（例如搜索弹窗宽度）可以保留为插件私有变量。

插件样式也不要限定在某个主题的正文容器里（例如 `.nagi-doc .kawa-container`）。选择器请直接基于插件自己的 `.kawa-*` class 和 ARIA、原生属性，这样换一个主题也照样生效。

### `api.router()` {#router}

`router()` 接收 KawaPress 的站内 `Router`，名字与用法和 Vue Router 相同的部分保持相同。它适合添加导航守卫：`beforeEach()` 返回 `false` 就取消这次跳转；插件想换一个地址时，自己调用 `router.push()`。

```ts
// src/runtime-plugin.ts
import { defineRuntimePlugin } from 'kawapress'

export default defineRuntimePlugin({
  name: '@acme/kawapress-plugin-notes',
  setup(api) {
    api.router((router) => {
      router.beforeEach((to) => {
        // 例如：草稿页只在本地开发时可访问
        if (to.path === '/notes/draft' && import.meta.env.PROD) {
          return false
        }
      })

      router.afterEach(() => {
        // 例如：在跳转后关闭弹窗或重置状态
      })
    })
  },
})
```

`Router` 只覆盖文档站需要的能力（跳转、读取当前路由、导航前后钩子），没有 `addRoute()`、命名路由、动态参数与重定向。新增页面请添加 Markdown 文件；如果你需要页面清单，用 Generator Plugin 发布自己的虚拟模块。

### 运行侧的注意事项 {#runtime-notes}

Runtime Plugin 会为每个 Vue App 执行一次。服务端渲染时，每次渲染都会创建新的 App；浏览器中则在启动时创建一次。因此，不要在模块顶层保存只属于某次渲染的状态。

另外，Runtime Plugin 同时在服务端和浏览器中运行。访问 `window`、`document` 等浏览器对象前，请先阅读 [SSR 兼容性](/guide/ssr-compatibility)。

## 发布前检查 {#publish-checklist}

发布前，请逐项确认：

- `package.json` 的 `name` 与 Generator Plugin 的 `name` 完全一致。
- 只有存在 Runtime Plugin 时才公开 `./runtime-plugin`。
- `files` 只包含发布需要的源码，并排除测试文件。
- `kawapress` 声明为 `peerDependencies`，避免站点中出现第二份核心包。
- 包内包含许可证文件和说明文档。

## 调试与常见错误 {#debugging}

插件报错时，错误信息会带上插件身份、执行面和能力名。例如：

```text
[@acme/kawapress-plugin-notes / generator / pageData] Plugin execution failed.
```

它表示 `@acme/kawapress-plugin-notes` 在生成侧的 `pageData()` 中失败。根据这三个部分，就能找到出错的注册位置。

另外，请注意下面的边界：

- 生成侧和运行侧的代码运行在不同阶段。不要让一侧依赖另一侧模块中的状态。
- `buildArtifacts()` 中不要使用 `eval` 或 `new Function` 绕过模块边界。需要加载模块时，请使用 `importModule()`。
- 0.1 不提供 `addPage()`。需要新的页面时，请先在 Markdown 源文件中创建它。
