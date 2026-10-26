---
title: 插件开发
description: 按扩展位置编写 KawaPress 插件，使用生成侧与运行侧 API 完成一个完整能力。
---

# 插件开发

本篇说明如何编写一个 KawaPress 插件。阅读前，请先了解 [插件体系](/guide/plugin-system) 中 Generator Plugin、Runtime Plugin 与 Preset 的分工。

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

## 创建 Generator Plugin {#create-a-generator-plugin}

Generator Plugin 使用 `definePlugin()` 创建。`name` 是插件的稳定身份，应与 npm 包名一致。`setup()` 接收 `api`，只需要注册真正用到的方法。

习惯上，插件导出一个工厂函数，让使用者可以传入选项：

```ts
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
      api.pageData((pageData) => {
        pageData.description ??= `${prefix}${pageData.title}`
      })
    },
  })
}

export default notesPlugin
```

把插件加入站点：

```ts
import notesPlugin from '@acme/kawapress-plugin-notes'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    notesPlugin({ prefix: '笔记：' }),
  ],
})
```

工厂函数负责校验并整理选项。`setup()` 中只使用整理好的值，不再重复读取原始选项。

## 生成侧 API {#generator-api}

六个生成侧方法都在 `setup(api)` 中注册。handler 可以是同步函数，也可以是异步函数。同一类 handler 按插件在 `plugins` 中的顺序串行执行。

### `config()`：读取或修改站点配置 {#config}

`config()` 在站点配置归一化后调用。handler 接收真实的站点配置对象，可以直接修改。

```ts
api.config((config) => {
  config.title ??= 'My Docs'
})
```

需要知道语言、部署路径或源码目录的插件，通常在这里记下配置，留给后面的方法使用。

### `markdown()`：扩展 Markdown 编译器 {#markdown}

`markdown()` 在 Markdown 编译器创建时调用，handler 接收真实的 `MarkdownExit` 实例。

```ts
import { useMarkdownItPlugin } from 'kawapress'
import { notePlugin } from 'markdown-it-example-note'

api.markdown((markdown) => {
  markdown.use(notePlugin)
})
```

如果 markdown-it 插件的类型与 KawaPress 不完全匹配，请使用 `useMarkdownItPlugin()`。它保留插件的参数类型，并集中处理类型兼容：

```ts
api.markdown((markdown) => {
  useMarkdownItPlugin(markdown, notePlugin, { className: 'acme-note' })
})
```

### `pageData()`：修改每个页面的数据 {#page-data}

`pageData()` 在每个页面的 `pageData` 生成之后调用。handler 接收当前页面的可修改数据：

```ts
api.pageData((pageData) => {
  pageData.description ??= `${pageData.title} 的笔记`
})
```

`pageData` 会被序列化给运行时使用，因此它只能包含 JSON 可表示的值：文字、数字、布尔值、`null`、数组和普通对象。`Date`、`Map`、函数和类实例都不能直接写入。例如，下面的写法会让构建失败：

```ts
api.pageData((pageData) => {
  pageData.frontmatter.reviewedAt = new Date('2026-10-08')
})
```

请改用字符串，例如 `'2026-10-08'`，再在需要时自行解析。

handler 的第二个参数告诉你当前页面来自哪个文件：`file` 是 Markdown 源文件的绝对路径，`sourcePath` 是相对 `srcDir` 的路径，例如 `/guide/intro.md`。需要读取文件信息（比如 git 提交时间）时使用它，不要从路由反推文件名，因为 `/guide` 既可能来自 `guide.md`，也可能来自 `guide/index.md`。

```ts
api.pageData((pageData, { file, sourcePath }) => {
  pageData.frontmatter.source = sourcePath
})
```

这两个值只在生成侧使用，不会发送到浏览器。需要在页面上显示时，像上面这样把需要的部分写进 `pageData`。

需要注意，在 `pageData()` 中修改的 `title` 只影响该页面自己的数据，不会进入用于导航的路由摘要（`route.meta.page`）：路由摘要描述的是作者在 Frontmatter 或第一个一级标题里写下的标题。

### `pageArtifact()`：观察页面构建结果 {#page-artifact}

`pageArtifact()` 在一个页面完成 Markdown 编译和全部 `pageData()` 之后调用。handler 只能读取结果，不能修改页面的源文件、数据或路由。

```ts
const sourcePaths = new Map<string, string>()

api.pageArtifact((artifact) => {
  sourcePaths.set(artifact.routePath, artifact.sourcePath)
})
```

如果只需要构建结束时的全部页面，请优先使用 `buildArtifacts()`。

### `vite()`：调整 Vite 配置 {#vite}

`vite()` 在 Vite 配置完成基础组装后调用。handler 接收完整的 `UserConfig`，可以直接修改。

```ts
import { someVitePlugin } from 'some-vite-plugin'

api.vite((config) => {
  config.plugins ??= []
  config.plugins.push(someVitePlugin())
})
```

KawaPress 会在创建 Vite 之前校验维持渲染所需的基本条件。插件不能通过修改 Vite 配置绕开这些条件。

### `buildArtifacts()`：生成静态文件 {#build-artifacts}

`buildArtifacts()` 只在 `kawapress build` 中执行。它发生在全部 Vite 构建完成之后、HTML 预渲染之前。handler 接收全部页面和一个 `emitFile()` 函数：

```ts
api.buildArtifacts(async ({ pages, emitFile }) => {
  const routes = pages.map(page => page.routePath)
  await emitFile('notes/routes.json', `${JSON.stringify(routes, null, 2)}\n`)
})
```

`emitFile()` 只接受输出目录内的相对路径。绝对路径、包含 `..` 的路径，以及与 `public/` 或其他插件产物同名的文件，都会直接报错。`pages` 按源文件路径排序，结果稳定。

### 按语言给出不同输出 {#localized-output}

多语言站点的插件往往要给不同语言不同的文案或文件。判断一个路由属于哪种语言时，别自己拆路径，用 `resolveLocaleIndex()`：

```ts
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

## 运行侧 API {#runtime-api}

Runtime Plugin 在网站运行时工作，它的代码会进入站点的 Vite 模块图，所以可以静态导入 `.vue`、CSS 和普通 Vue 插件。

它与 Generator Plugin 放在同一个包中，并通过 `./runtime-plugin` 入口公开。它的 `name` 同样应与包名一致。

### `vueApp()`：安装 Vue 插件或全局组件 {#vue-app}

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

### `addToOutlet()`：把界面交给主题摆放 {#add-to-outlet}

导航栏按钮、复制按钮、评论区这类界面，属于页面框架的某个位置，而不属于 Markdown 正文。这类界面应该通过 Outlet 交给主题：

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

主题只需在合适的位置写 `<KawaOutlet name="doc.header" />`，不需要知道这个插件的存在。

首版有四个 Outlet：

| Outlet | 渲染方 | 适合放什么 |
| --- | --- | --- |
| `header.actions` | 主题 | 搜索按钮、仓库链接等顶栏操作 |
| `doc.header` | KawaPress（Markdown 首个 H1 之后） | 复制页面、页面工具 |
| `doc.footer` | 主题 | 最后更新时间、编辑此页链接 |
| `doc.after` | 主题 | 评论区、反馈表单 |

规则很简单：

- `id` 在同一个插件内必须唯一。完整标识是 `<插件名>:<id>`，插件名由 KawaPress 自动补上，插件无法伪造。
- 渲染顺序先按插件在 `plugins` 数组中的顺序，再按同一个插件内调用 `addToOutlet()` 的先后顺序。不提供数字权重或相对位置设置。
- 名字写错、`id` 为空、同一个插件里 `id` 重复，都会直接报错，错误信息会带插件名。
- 全站都没有页面渲染你使用的 Outlet 时，`kawapress build` 会按插件名给出警告。看到警告时，先确认主题是否支持这个 Outlet。

如果插件既会显示自己的界面，又希望主题可以完全接管，可以另外导出一个组合式函数（例如 `useCopyPage()`），主题就能用自己的组件套用同一套逻辑，然后在 Slot 中过滤掉默认组件。

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

### `router()`：调整运行时路由 {#router}

`router()` 接收真实的 vue-router `Router`。它适合添加导航守卫：

```ts
api.router((router) => {
  router.beforeEach((to) => {
    if (to.path === '/old-notes') {
      return '/notes'
    }
    return true
  })
})
```

`router.addRoute()` 只修改运行时的路由，不会自动生成新的静态页面。

### 运行侧的注意事项 {#runtime-notes}

Runtime Plugin 会为每个 Vue App 执行一次。服务端渲染时，每次渲染都会创建新的 App；浏览器中则在启动时创建一次。因此，不要在模块顶层保存只属于某次渲染的状态。

另外，Runtime Plugin 同时在服务端和浏览器中运行。访问 `window`、`document` 等浏览器对象前，请先阅读 [SSR 兼容性](/guide/ssr-compatibility)。

## 完整的包结构 {#package-layout}

一个包含两个运行入口的插件，通常这样组织：

```text
@acme/kawapress-plugin-notes
├─ package.json
└─ src
   ├─ index.ts           默认入口：Generator Plugin
   ├─ runtime-plugin.ts  运行入口：Runtime Plugin
   └─ NotesBadge.vue
```

`package.json` 需要公开两个入口，并只把源码交给 npm：

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

如果插件只参与构建，就删除 `./runtime-plugin` 入口和 `runtime-plugin.ts`。

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
