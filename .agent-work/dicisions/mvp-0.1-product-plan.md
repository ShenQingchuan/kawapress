# KawaPress 0.1 产品方案

本文是 KawaPress 0.1 的唯一产品与架构决策来源。实现、测试、示例和文档均以本文为准。

## 一、产品定位

KawaPress 是一个全新的、以 Vue 为核心的静态站点生成器，主要用于文档站等内容型网站。写作者使用 Markdown 编写内容，KawaPress 将内容编译成可预渲染、可在浏览器接管的 Vue 网站。

基本取舍：

- 只支持 Vue，不做多框架适配。
- 不兼容 VitePress 配置，不背负迁移包袱。
- 开发模式必须真实执行 SSR，尽早暴露只在服务端渲染时出现的问题。
- 内核不内置界面；官方 UI 与第三方 UI 使用同一套公开能力。
- 插件以原子能力为单位，Preset 负责组合一组插件形成开箱即用的产品体验。

包与命令：

- 核心 npm 包：`kawapress`
- 官方包：`@kawapress/*`
- CLI：`kawapress`

## 二、渲染架构

### 2.1 开发与构建使用同一条 SSR 管线

开发模式下，每次页面请求都先在服务端真实渲染 Vue App，再把 HTML 交给浏览器 hydration。构建模式使用同一份 App 入口和渲染函数预渲染所有页面。

开发服务器基于 Vite Environment API，同时维护 SSR 与浏览器环境。构建时分别生成 client bundle 和 SSR bundle，再由 SSR bundle 输出静态 HTML。

页面生命周期：

```text
首次请求
  → SSR 生成 HTML
  → 浏览器加载 client bundle
  → Vue hydration
  → 后续站内跳转由 vue-router 接管
```

### 2.2 路由

路由使用 vue-router：

- SSR 使用 memory history。
- 浏览器使用 web history。
- Markdown 文件路径直接决定路由。
- 路由路径清单可以进入浏览器，页面组件与 pageData 按需加载。
- 0.1 不提供插件虚拟页面 API，也不提供 `addPage()`。

非 Markdown 内容源、动态路由、RSS、sitemap、归档页等能力留到后续内容层与路由方案中统一设计。

## 三、生成侧与运行侧

KawaPress 把插件代码分成生成侧与运行侧。两侧属于同一个逻辑插件，但由不同加载器和模块图分别加载。

### 3.1 生成侧

生成侧运行 KawaPress 本身，负责：

- 读取配置；
- 编译 Markdown；
- 生成 pageData；
- 配置 Vite；
- 编排开发服务器与构建。

公开 API 使用 `Plugin`，不绑定 Node.js 等具体宿主。KawaPress 0.1 的正式运行与测试基线仍为 Node.js 22.12 及以上；Bun 等其他宿主在验证兼容性后再承诺支持。

### 3.2 运行侧

运行侧是最终网站的 Vue 运行时。同一份 Runtime Plugin 源码由 Vite 分别加载到：

- SSR module graph：生成首屏 HTML；
- client module graph：在浏览器 hydration 并处理交互。

Runtime Plugin 不强制拆分 client 与 SSR 入口。插件作者自行决定 SSR 兼容方式：

- 通用 Vue 插件可以直接在两边安装；
- 浏览器专属行为使用 `import.meta.env.SSR` 判断；
- 会在模块求值时访问 `window` 的依赖必须在非 SSR 分支中动态导入。

生成侧与运行侧不能依赖共享模块实例、闭包或内存状态。

## 四、插件模型

### 4.1 逻辑插件

Plugin 是一个可独立安装、可配置的原子能力。一个逻辑插件包可以拥有：

```text
Plugin package
├─ 默认 Plugin（生成侧）
└─ Runtime Plugin（可选）
```

默认 Plugin 与 Runtime Plugin 是同一逻辑插件的两个实现面，不是用户需要分别安装的两个插件。

站点用户只导入插件包的默认工厂一次：

```ts
import analytics from 'kawa-analytics'

export default nagi({
  plugins: [
    analytics({ siteId: 'docs-site' }),
  ],
})
```

插件包的默认入口负责导出带类型的插件工厂与生成侧能力；可选的 `./runtime-plugin` 入口承载 Runtime Plugin。KawaPress 根据逻辑插件身份自动关联运行侧。站点用户不导入 `kawa-analytics/runtime-plugin`。

Runtime Plugin 解析必须支持 Preset 内置插件：当插件包不是站点的直接依赖时，KawaPress 继续从已解析的 Preset/Plugin 包依赖图中查找其 package exports，不要求站点重复声明 Preset 已经携带的依赖。

```json
{
  "name": "kawa-analytics",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./runtime-plugin": {
      "types": "./dist/runtime-plugin.d.ts",
      "import": "./dist/runtime-plugin.js",
      "default": "./dist/runtime-plugin.js"
    }
  }
}
```

发布插件的稳定身份必须与 package name 一致。插件选项由默认工厂完成校验和标准化；需要进入运行侧的数据必须是可序列化的显式数据，生成侧的函数、实例与闭包不能传给 Runtime Plugin。

### 4.2 安装方式

配置只接受导入后的插件工厂结果，不使用包名字符串安装插件：

```ts
import analytics from 'kawa-analytics'

export default defineConfig({
  plugins: [
    analytics({ siteId: 'docs-site' }),
  ],
})
```

插件不存在框架统一提供的 `enabled` 选项。每个插件只声明与自身能力有关的类型化选项。

插件数组顺序就是执行顺序：

- 同一能力的后续插件看到前面插件的修改；
- 后续插件可以覆盖前面的结果；
- 不引入数字优先级、`before`、`after` 或依赖图。

### 4.3 Generator Plugin API

默认 Plugin 使用 `definePlugin()` 定义，`setup()` 接收 `GeneratorPluginAPI`：

```ts
import { definePlugin } from 'kawapress'

export default definePlugin({
  name: 'my-plugin',
  setup(api) {
    api.config((config) => {
      config.title = 'Docs'
    })

    api.markdown((markdown) => {
      markdown.use(...plugins)
    })

    api.pageData((pageData) => {
      pageData.title += '!'
    })

    api.vite((viteConfig) => {
      viteConfig.plugins ??= []
      viteConfig.plugins.push(myVitePlugin)
    })
  },
})
```

MVP 只公开四个生成侧注册方法：

| 方法 | 调用时机 | 得到的对象 |
|---|---|---|
| `config(handler)` | 站点配置归一化时 | 可修改的 KawaPress Config |
| `markdown(handler)` | Markdown 编译器创建时 | 真实 `MarkdownExit` 实例 |
| `pageData(handler)` | 每个页面的 pageData 生成后 | 当前页面的可修改 pageData |
| `vite(handler)` | Vite 配置完成基础组装后 | 完整、可修改的 Vite `UserConfig` |

规则：

- handler 可以同步或异步。
- 同类 handler 按插件顺序串行执行。
- handler 直接修改真实对象，不使用“返回局部对象再合并”的双重语义。
- `vite()` 允许修改完整 Vite 配置；KawaPress 只保留维持渲染闭环所需的最小不变量并在最终创建 Vite 前校验。
- `GeneratorPluginAPI` 不提供组件、CSS、Vue plugin 或 client/SSR 分支能力。
- 0.1 不提供 `addPage()`。

### 4.4 Runtime Plugin API

Runtime Plugin 使用对象形式的 `defineRuntimePlugin({ name, setup })` 定义：

```ts
import FloatingVue from 'floating-vue'
import { defineRuntimePlugin } from 'kawapress'
import Layout from './Layout.vue'
import 'floating-vue/dist/style.css'

export default defineRuntimePlugin({
  name: 'my-plugin',
  setup(api) {
    api.vueApp((app) => {
      app.use(FloatingVue)
      app.component('Layout', Layout)
    })

    api.router((router) => {
      router.beforeEach(() => {
        // navigation behavior
      })
    })
  },
})
```

MVP 只公开两个 Runtime 注册方法：

| 方法 | 得到的对象 | 用途 |
|---|---|---|
| `vueApp(handler)` | 真实 Vue `App` | `app.use`、全局组件、provide、errorHandler 等 |
| `router(handler)` | 真实 vue-router `Router` | 导航守卫与运行时路由调整 |

执行时机：

```text
创建 Vue App 与 Router
  → 安装 KawaPress 核心能力
  → 按插件顺序执行 vueApp/router handlers
  → 执行首次导航
  → SSR render 或浏览器 mount
```

规则：

- handler 可以同步或异步。
- Runtime Plugin 在每个 Vue App 实例上执行：SSR 每次渲染创建新 App，浏览器启动时创建一次。
- Runtime Plugin 代码已经位于 Vite module graph，可以静态导入 `.vue`、CSS 和普通 Vue plugin，并直接传真实对象。
- `router.addRoute()` 只修改运行时 Router；0.1 不承诺因此自动新增静态预渲染页面。
- `head`、初始状态和 SSR request context 不进入 0.1 API；有明确需求时可在 Runtime API 上增加新的注册方法。

### 4.5 插件生命周期与错误

- 默认 Plugin 在 dev 启动或 build 开始时注册生成侧 handlers。
- Runtime Plugin 由 Vite 加载，不由生成侧加载或执行。
- `kawapress.config.ts` 变化时，KawaPress 自动重新加载配置并重建 Vite server，外层 HTTP server 与端口保持不变。
- 默认 Plugin 自身源码变化在 0.1 中仍要求重新执行 `kawapress dev`。
- `.vue`、Markdown、CSS 与 Runtime graph 内依赖继续使用 Vite HMR；必要时允许 full reload。
- 插件错误必须带逻辑插件身份、执行面和具体能力名，例如 `my-plugin / markdown` 或 `my-plugin / runtime / vueApp`。
- 插件不得依赖另一个执行面中的模块级状态。

## 五、Preset

Preset 不是第三种插件，也没有独立生命周期。Preset 使用 `definePreset()` 定义；它接收默认配置并返回一个可调用的 Config 工厂。

配置对象不存在 `presets` 字段。更换 Preset，就是更换最外层配置工厂：

```ts
import { nagi } from '@kawapress/preset-nagi'

export default nagi({
  title: 'My Docs',
  plugins: [myPlugin()],
})
```

Preset 规则：

- Preset 内部组合一组原子插件。
- 用户配置覆盖 Preset 默认配置。
- 用户 `plugins` 追加在 Preset 内置插件之后，因此可以覆盖默认行为。
- Preset 自己不直接参与插件生命周期；需要生成侧或运行侧能力时，包含对应的逻辑插件。
- `definePreset()` 统一处理配置覆盖与插件追加，Preset 作者不手写合并逻辑。
- `defineConfig()` 始终是无需 Preset 的底层配置入口。

示意实现：

```ts
const nagiPlugin = definePlugin({
  name: '@kawapress/preset-nagi',
  setup() {},
})

export const nagi = definePreset({
  title: 'KawaPress',
  plugins: [
    nagiPlugin,
    shikiPlugin(),
  ],
})
```

官方默认 Preset 是 `@kawapress/preset-nagi`。Nagi 的 UI 是 Preset 内部的普通 Runtime Plugin，没有内核特权。

## 六、主题与界面

内核不提供界面组件。默认 Preset 必须通过公开 Runtime Plugin API 安装 UI。

KawaPress 0.1 约定以下必备全局组件名：

- `Layout`
- `NotFound`

Nagi Runtime Plugin 使用真实 SFC 对象注册它们：

```ts
defineRuntimePlugin({
  name: '@kawapress/preset-nagi',
  setup(api) {
    api.vueApp((app) => {
      app.component('Layout', Layout)
      app.component('NotFound', NotFound)
    })
  },
})
```

其他导航栏、侧边栏、正文、页脚等组件由 Preset 自己组织。需要成为稳定替换点的组件，必须有明确名称、props 类型和文档；0.1 只承诺渲染闭环所需的最小组件契约。

主题组件使用框架能力时，从 `kawapress/client` 导入公开 composables 与组件，不依赖 KawaPress 内部文件。

## 七、Markdown 管线

Markdown 引擎使用 `markdown-exit`：

- 与 markdown-it v14 插件 API 兼容；
- 原生支持异步渲染；
- 具有完整 TypeScript 类型。

每个 Markdown 文件编译成 Vue 组件。KawaPress 自己维护站点感知的编译层，负责：

- frontmatter；
- 标题与 headers；
- pageData；
- Markdown 中的 Vue 组件；
- SFC block；
- 链接信息与后续死链检查入口。

基础能力使用兼容的 `@mdit-vue` 独立插件实现。外部插件通过 `GeneratorPluginAPI` 的 `markdown()` 获得真实 `MarkdownExit` 实例。

代码高亮使用 Shiki，并作为原子 Plugin 接入 `markdown()`。Shiki transformer 保持可配置。Twoslash 不属于 0.1 范围，等待 Runtime Plugin 与浮层 UI 能力稳定后再实现。

### 7.1 Shiki 与 Twoslash 增强

0.1 检查点完成后，Shiki 从核心包迁移为普通逻辑插件包 `@kawapress/plugin-shiki`：

```text
@kawapress/plugin-shiki
├─ 默认入口：Shiki 高亮与可选 Twoslash transformer
└─ ./runtime-plugin：TwoslashFloatingVue 与浮层样式
```

公开配置使用同一个 `shikiPlugin()` 工厂：

```ts
shikiPlugin({ twoslash: false })
shikiPlugin({ twoslash: true })
shikiPlugin({ twoslash: { /* TwoslashOptions */ } })
```

规则：

- `twoslash` 未填写或为 `false` 时只执行普通 Shiki 高亮。
- `twoslash: true` 使用 KawaPress 基于 `@shikijs/twoslash` 与 `twoslash-vue` 组装的默认配置；默认 `explicitTrigger: true`，只有带 `twoslash` meta 的代码块执行分析。
- 对象形式使用 KawaPress 导出的 `TwoslashOptions`，它基于通用 `TransformerTwoslashOptions`，不暴露自定义 renderer 与 twoslasher；其中的函数、缓存和 TypeScript 对象只留在生成侧，不传入 Runtime graph。
- Nagi 明确组合 `shikiPlugin({ twoslash: true })`，不在 Preset 内实现私有 Twoslash 逻辑。
- KawaPress 自己维护 Floating Vue renderer、Runtime Plugin 和 CSS，不依赖 `@shikijs/vitepress-twoslash` 或 VitePress 运行时。
- Runtime Plugin 在 SSR 与 client 创建 Vue App 时都直接安装 `floating-vue`，并导入通用 Twoslash 样式及 KawaPress 自有适配样式，保证两侧组件树一致。
- 当前 Runtime Plugin 协议不传递生成侧选项，因此只要安装 `@kawapress/plugin-shiki` 就会加载其 Runtime Plugin；`twoslash: false` 只关闭生成侧分析，不作为运行侧裁剪开关。
- 生成侧与运行侧之间只通过生成后的 Vue template 标记、class 和 CSS 约定衔接，不共享 transformer、TypeScript Program、闭包或模块实例。
- 普通代码块使用 KawaPress 自有的 `v-pre` Shiki transformer 保护 Vue 插值；活跃 Twoslash 代码块由 KawaPress transformer 移除 `v-pre` 并完成花括号转义，不再使用高亮后恢复 `{{ }}` 的方案。
- Twoslash 的浮层 UI 使用 Floating Vue；本阶段不自制 Tooltip/Popover 组件，也不开放 Floating Vue 运行侧配置。

## 八、配置与数据

核心配置至少包含：

```ts
interface KawaPressConfig {
  title?: string
  srcDir?: string
  plugins?: KawaPressPlugin[]
}
```

`defineConfig()` 只提供类型推断与配置归一化，不引入额外生命周期。

pageData 至少包含：

```ts
interface PageData {
  path: string
  title: string
  frontmatter: Record<string, unknown>
  headers: PageHeader[]
}
```

站点数据与 pageData 作为可序列化数据进入 Runtime graph。生成侧的函数、类实例与文件句柄不能进入浏览器。

## 九、仓库与工程规范

仓库使用 pnpm monorepo。

0.1 至少包含：

```text
packages/kawapress
packages/preset-nagi
examples/playground
```

工程约定：

- 全仓库使用 TypeScript 6。
- Vue 代码使用 Composition API、`<script setup>` 与 TypeScript。
- 依赖版本通过具名 pnpm catalogs 管理，禁止裸 `catalog:`。
- 0.1 官方包直接发布 TypeScript、Vue SFC 与 CSS 源码，不执行独立的 package build；生成侧源码由 Jiti 加载，运行侧源码由 Vite 加载。
- 源码发布包使用标准 package exports：`types`、`import` 与 `default` 均指向源码，不使用自定义 `source` condition，也不使用旧式 `module` 字段或 condition。
- 第三方插件可以发布源码或预编译产物；KawaPress 不要求插件声明 `source` condition。预编译包将 `types` 指向声明文件，并将 `import`、`default` 指向 ESM 产物。
- KawaPress 不在 TypeScript、Vitest 或 Vite 中启用自定义 `source` condition。Vite 的 SSR plugin pipeline 单独使用 `module` condition，确保进入 Module Runner 的 Vue 依赖选择 ESM 入口；否则 dev SSR 会把 `@vue/server-renderer` 的 CommonJS 入口与 top-level await 放入同一执行图并触发 `ERR_AMBIGUOUS_MODULE_SYNTAX`。这是 SSR 依赖解析约束，不是插件 package exports 约定。
- Runtime Plugin 静态导入的 Vue SFC 与 CSS 由用户站点的 Vite 自动打包；用户不需要单独导入主题或插件 CSS。
- Node.js 正式支持版本与 Vite 8 对齐，为 22.12 及以上。
- CLI 提供 `kawapress dev` 与 `kawapress build`。
- 开源协议为 MIT。
- 质量检查以终端命令为准：`pnpm lint`、`pnpm typecheck`、`pnpm test`。

## 十、0.1 交付范围

0.1 必须完成：

- `kawapress dev` 与 `kawapress build`。
- 开发和构建共用 Vite Environment SSR 渲染管线。
- 默认 Plugin 与 Runtime Plugin 的加载、顺序、错误和 dev/build 闭环。
- 对象形式的 `definePlugin({ name, setup })` 与四个生成侧注册方法。
- 对象形式的 `defineRuntimePlugin({ name, setup })` 与 `vueApp()`、`router()`。
- 插件默认工厂只安装一次，自动关联可选的 `./runtime-plugin` 运行侧。
- `defineConfig()` 与 `definePreset()`。
- 默认 `@kawapress/preset-nagi`。
- Markdown 编译成 Vue 组件。
- frontmatter 与 pageData。
- Shiki 高亮及 transformer 配置。
- 文件路径路由、SSR 首屏和浏览器内导航。
- playground 同时验证默认 Plugin、Runtime Plugin、Preset、SSR、hydration 和 build。

0.1 明确不包含：

- `addPage()` 或插件虚拟页面。
- Twoslash 与 Floating Vue。
- 搜索、侧边栏自动生成和深浅色模式。
- Content Layer、远程内容源和 CMS。
- 国际化、版本化文档和博客能力。
- 默认 Plugin 热重载。
- 生成侧与浏览器之间的 RPC。
- Runtime 初始状态协议、SSR request context 和 render hooks。

## 十一、后续路线

### 0.2：文档站日常体验

- 内置本地全文搜索。
- 侧边栏自动生成。
- 深浅色模式。
- 上一页、下一页与编辑链接。
- `create-kawapress` 脚手架。

### 0.3：内容与生态

- 类型化 Content Layer。
- frontmatter schema 与构建校验。
- 内容查询。
- 国际化。
- 插件与 Preset 开发文档、脚手架和发布规范。

### 后续

- 版本化文档。
- 博客、标签、RSS 与归档。
- CMS 与远程内容源。
- 在插件边界稳定后重新设计 Twoslash 浮层体验。
