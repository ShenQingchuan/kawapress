# KawaPress 0.1 产品方案

本文是 KawaPress 0.1 的唯一产品与架构决策来源。实现、测试、示例和文档均以本文为准。

## 一、产品定位

KawaPress 是一个全新的、以 Vue 为核心的静态站点生成器，主要用于文档站等内容型网站。写作者使用 Markdown 编写内容，KawaPress 将内容编译成可预渲染、可在浏览器接管的 Vue 网站。

KawaPress 期望成为一个更好的 VitePress，是由 Vue 社区成员自主开发的独立解决方案。产品保留 VitePress 简洁、轻快、专注文档阅读的优点，同时追求更完整的默认体验、更自然的多语言支持，以及更自由的主题与插件扩展空间；它不是 VitePress 的复制品或配置兼容层。

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
- 只写 Markdown 并使用默认 nagi 的文档站只安装 `kawapress`。该包把官方 nagi Preset 作为正式依赖，并通过 `kawapress/nagi` 重新导出它的工厂、helper 与类型；默认界面运行所需的 Vue、nagi、Shiki、Code Group 等依赖由框架自己的依赖图携带，用户不重复声明。KawaPress 的 Vite 配置为编译器生成的 `import "vue"` 提供精确的 `^vue$` alias：优先解析站点直接安装的 Vue，未安装时回退 KawaPress 自己携带的 Vue runtime，并保持 `dedupe`。这个内部构建解析不等于用户拥有 Vue 直接依赖；用户需要在 Markdown、配置扩展或自定义主题中直接 `import` Vue API、编写 Vue 组件时，必须把 `vue` 显式安装为站点自己的依赖，以获得正确的包边界、编辑器类型与版本声明。《快速开始》只用一个标题为“Vue 作为 peer dependency”的简短提示卡表达这条规则，不展开解释内部依赖图。独立 `@kawapress/*` 包继续存在，供高级用户单独组合或第三方 Preset 复用。

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

KawaPress 选择 Vue 官方的 Vue Router，而不是为静态文档场景维护一套框架私有的轻量 Router。这个选择会增加一个通用运行时依赖，并携带基础文档站暂时用不到的能力；换来的结果是 SSR memory history、浏览器 web history、导航守卫、路由记录与 Runtime Plugin 共用同一套 Vue 生态标准接口，Core 不需要长期自行维护 URL、history、导航竞态和扩展协议。`router.addRoute()` 只修改运行时 Router，不自动进入静态预渲染页面清单。

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
- `kawapress.config.ts` 或它从站点根目录内导入的本地配置辅助模块变化时，KawaPress 自动重新加载完整配置依赖图并重建 Vite server，外层 HTTP server 与端口保持不变。配置加载必须返回本地依赖路径，不能只监听入口文件。监听使用文件系统事件而不是轮询；重建前比较文件内容，相同内容产生的重复事件必须直接忽略。
- 默认 Plugin 自身源码变化在 0.1 中仍要求重新执行 `kawapress dev`。
- `.vue`、Markdown、CSS 与 Runtime graph 内依赖继续使用 Vite HMR；必要时允许 full reload。
- 插件错误必须带逻辑插件身份、执行面和具体能力名，例如 `my-plugin / markdown` 或 `my-plugin / runtime / vueApp`。
- 插件不得依赖另一个执行面中的模块级状态。

## 五、Preset

Preset 不是第三种插件，也没有独立生命周期。Preset 使用 `definePreset()` 定义；它接收默认配置并返回一个可调用的 Config 工厂。

配置对象不存在 `presets` 字段。更换 Preset，就是更换最外层配置工厂。使用官方默认体验时从 `kawapress/nagi` 导入，无需额外安装 Preset 包：

```ts
import { nagi } from 'kawapress/nagi'

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
- Core 公开 `PresetConfig<ResolvedThemeConfig>` 类型辅助器，默认把 Preset 的完整主题配置映射为用户可选的 `Partial<ResolvedThemeConfig>`，并同时应用到顶层与各 locale 的 `themeConfig`。Preset 作者只定义一次完整主题配置字段，不重复维护可选输入类型。

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

官方内置默认 Preset 是 `@kawapress/preset-nagi`，名称写作 nagi（凪）。它提供类同 VitePress 默认主题的完整文档站体验，同时保留 KawaPress 自己的视觉与交互实现。nagi 的 UI 是 Preset 内部的普通 Runtime Plugin，没有内核特权。

## 六、主题与界面

内核不提供界面组件。KawaPress 通过内置默认 Preset nagi提供开箱即用的文档界面；它在信息层级、文档布局与阅读体验上类同 VitePress 默认主题，但必须完全通过公开 Runtime Plugin API 安装 UI。

KawaPress 0.1 约定以下必备全局组件名：

- `Layout`
- `NotFound`

nagi Runtime Plugin 使用真实 SFC 对象注册它们：

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
- nagi 明确组合 `shikiPlugin({ twoslash: true })`，不在 Preset 内实现私有 Twoslash 逻辑。
- KawaPress 自己维护 Floating Vue renderer、Runtime Plugin 和 CSS，不依赖 `@shikijs/vitepress-twoslash` 或 VitePress 运行时。
- Runtime Plugin 在 SSR 与 client 创建 Vue App 时都直接安装 `floating-vue`，并导入通用 Twoslash 样式及 KawaPress 自有适配样式，保证两侧组件树一致。
- 当前 Runtime Plugin 协议不传递生成侧选项，因此只要安装 `@kawapress/plugin-shiki` 就会加载其 Runtime Plugin；`twoslash: false` 只关闭生成侧分析，不作为运行侧裁剪开关。
- 生成侧与运行侧之间只通过生成后的 Vue template 标记、class 和 CSS 约定衔接，不共享 transformer、TypeScript Program、闭包或模块实例。
- 普通代码块使用 KawaPress 自有的 `v-pre` Shiki transformer 保护 Vue 插值；活跃 Twoslash 代码块由 KawaPress transformer 移除 `v-pre` 并完成花括号转义，不再使用高亮后恢复 `{{ }}` 的方案。
- Twoslash 的浮层 UI 使用 Floating Vue；本阶段不自制 Tooltip/Popover 组件，也不开放 Floating Vue 运行侧配置。KawaPress 只提供一层透明的 `KawaTwoslashMenu` 适配组件，用 Vue `useId()` 向 Floating Vue 传入 SSR/client 稳定一致的 `ariaId`，避免其随机 ID 造成 hydration mismatch。

### 7.2 Code Group

通用代码 Tab 能力由独立逻辑插件包 `@kawapress/plugin-code-group` 提供，不写死在 Core 或 nagi 组件中。默认入口在 Markdown 管线解析 VitePress 风格的 `::: code-group` 容器与代码围栏后的 `[标签]`，生成结构稳定的 `KawaCodeGroup` 组件槽位；`./runtime-plugin` 注册真实 Vue 组件，负责 Tab 选择、方向键、Home、End、ARIA 关系与 SSR/client 稳定 ID。容器只接受 fenced code block，其他正文直接给出可执行的编译错误。

插件只负责结构、状态和 `.kawa-code-group*` 稳定 class；nagi 负责其视觉样式。nagi 的 Code Group Tab 栏纵向严格裁切，不出现原生滚动条或越界滚动；Tab 过多时仍可横向滑动，但隐藏原生滚动条并阻止滚动越界传递。nagi Preset 默认组合该插件，官方《快速开始》使用它展示 npm、pnpm 与 Yarn 命令，不能把三个高频包管理器命令堆成连续普通代码块。

### 7.3 UnoCSS

原子 CSS 能力由独立逻辑插件包 `@kawapress/plugin-unocss` 提供，不写死在 Core。Generator Plugin 通过公开的 `api.vite()` 注入 `unocss/vite`；`./runtime-plugin` 静态导入 `virtual:uno.css`，让 SSR 与 client 使用同一份样式入口，站点用户不手动导入生成 CSS。插件接受 UnoCSS 的类型化 Vite 配置，并继续让 UnoCSS 从站点根目录发现和热更新 `uno.config.*` 或 `unocss.config.*`。

nagi Preset 默认组合该插件，并默认启用 `presetWind4`、`presetIcons` 与 `presetWebFonts`。Wind4 保留按需 theme 变量和 property 生成，但显式关闭会影响 nagi 与其他独立 Plugin 的全局 reset。默认 Icons 不捆绑具体 Iconify 图标集，默认 Web Fonts 不声明字体且不发起网络请求；站点只有在实际配置图标集或字体时才承担对应资源。只使用默认工具类的 nagi 站点仍只安装 `kawapress`；站点需要在 `uno.config.ts` 直接导入 UnoCSS API、额外 preset 或 Iconify collection 时，应显式安装并声明对应包。官方文档里的 UnoCSS 示例直接使用 Wind4 调色板值，不依赖 nagi 私有 CSS 变量；示例卡片使用 `bg-indigo-500/8` 低透明度背景，文字继承 nagi 已针对明暗模式调好的正文颜色，不使用侧边粗色条，并在渲染结果下方直接展示对应 HTML。

## 八、配置与数据

核心配置至少包含：

```ts
interface LocaleConfig<ThemeConfig> {
  label: string
  lang?: string
  dir?: 'ltr' | 'rtl'
  link?: string
  title?: string
  themeConfig?: ThemeConfig
}

interface KawaPressConfig<ThemeConfig extends object = object> {
  title?: string
  base?: string
  srcDir?: string
  themeConfig?: ThemeConfig
  locales?: Record<string, LocaleConfig<ThemeConfig>>
  plugins?: KawaPressPlugin[]
}
```

`defineConfig()` 只提供类型推断与配置归一化，不引入额外生命周期。Core 的配置类型使用 ThemeConfig 泛型，使 Preset 能为顶层与各语言的 `themeConfig` 提供同一份类型推断，Core 不解释主题私有字段。`base` 表示站点部署路径，归一化为以 `/` 开头和结尾的绝对路径；Vite 资源、Vue Router history、Markdown 根路径链接、站点与 locale 首页链接、开发 SSR 和预渲染 HTML 必须统一使用它，保证 GitHub Pages 等子路径部署可用。

pageData 至少包含：

```ts
interface PageData {
  path: string
  title: string
  frontmatter: Record<string, unknown>
  headers: PageHeader[]
}
```

`PageData.path` 始终是公开路由路径，不是磁盘绝对路径。核心使用同一个 Markdown page loader 生成页面组件与路由元数据，保证 Generator Plugin 的 `pageData()` 修改只执行一次且两份数据不漂移。`kawapress/client` 只公开当前页面数据：

```ts
declare function usePageData(): ComputedRef<PageData | undefined>
```

核心不提供 `usePages()` 或全站内容 composable。nagi 通过公开的 Vue Router 实例及其路由元数据生成自动侧边栏，并读取各内容目录旁的 `_meta.json` 管理目录与页面的显示顺序和本地化名称，不使用 frontmatter `order`。`_meta.json` 使用按展示顺序排列的数组，字符串条目只声明文件或目录名，对象条目可以通过 `type`、`name` 与 `label` 区分文件、目录并覆盖显示名称；未列出的现有页面或目录继续按路径顺序追加。每个 locale 可以拥有自己目录下的 `_meta.json`，因此 Sidebar 结构与标签自然随路径语言切换。nagi 的 Generator Plugin 通过 JSON 虚拟模块把这些结构化内容元数据交给运行侧；该模块只传标准 JSON，不承载主题配置或生成侧对象。

nagi 同时支持 VitePress 风格的 `themeConfig.sidebar` 手写配置：可以提供全局 Sidebar 数组，也可以用路径前缀对象为不同区域提供数组或 `{ base, items }`。当前路由命中手写配置时以手写配置为准；没有命中时回退到 `_meta.json` 自动 Sidebar。Core 的 locale `themeConfig` 浅合并允许各语言覆盖 Sidebar。nagi 另外公开 `defineLocalizedSidebars()`：站点只写一次 Sidebar 结构和无语言前缀的路由，为每个 locale 提供前缀和本地化文字，helper 自动生成各语言的配置，避免复制整棵 Sidebar。官方双语文档使用该 helper Dogfood 配置式 Sidebar。Sidebar 顶层分组之间使用主题 divider 分割，不要求配置作者插入装饰性条目。

本地全文搜索由独立逻辑插件包 `@kawapress/plugin-search` 提供，不写死在 Core 或 nagi 内部。Generator Plugin 独立扫描 `srcDir` 下的 Markdown，按标题层级切成搜索段落，以公开路由作为结果地址；frontmatter 中显式设置 `search: false` 的页面不进入索引。索引使用 MiniSearch 在生成侧预构建，并按 Core locale 路径拆成独立虚拟模块；浏览器首屏只得到很小的 locale loader 映射，用户首次打开搜索时才加载 MiniSearch 运行时和当前语言索引，不能把索引或全站正文打进主入口。中英文共用大小写归一化与 CJK 感知分词，搜索只返回当前 URL locale 的结果。插件不向 Core 增加 `usePages()`、全量 pageData 或搜索专用运行时 API。

`@kawapress/plugin-search/runtime-plugin` 注册可复用的真实 Vue 搜索组件并自动导入基础样式，稳定结构 class 使用 `.kawa-search*` 命名空间；其他 Preset 可以组合同一插件并把组件放进自己的界面。nagi Preset 默认组合 `searchPlugin()`，NavBar 只引入公开搜索组件并通过 CSS 变量适配主题视觉，不维护搜索文案、索引、查询状态或键盘交互。搜索组件根据 Core 当前 locale 的 `lang` 内置中文与英文，其他语言回退英文；其他宿主也可以通过组件 props 覆盖文案。`Ctrl/Command + K` 与焦点不在输入控件时的 `/` 可以打开搜索。静态 SSR 无法从构建环境预知访客平台；Search Runtime Plugin 在 SSR `<head>` 注入一段内容固定的同步平台检测脚本，在浏览器绘制正文前为 `<html>` 写入平台属性。搜索按钮始终输出同时包含 `⌘` 与 `Ctrl` 的稳定 DOM，由 CSS 根据该属性从首帧开始只显示正确标记；Vue hydration 不再替换文字，避免首屏文案与宽度跳变。搜索使用浏览器原生模态 dialog，支持 Escape、遮罩关闭、结果方向键循环导航、Enter 打开、明确的 loading/empty/error 状态和安全的纯文本高亮，不通过 `v-html` 注入索引内容。

pageData 必须能无损表示为标准 JSON 值，只允许 `null`、布尔值、有限数字、字符串、数组和普通对象。`undefined`、非有限数字、BigInt、函数、Symbol、稀疏数组、循环引用、Date、Map、Set、类实例、Vue ref 与其他运行时对象均在生成后立即报错，不允许被 `JSON.stringify()` 静默丢弃或改变类型。KawaPress 公开并在所有数据边界复用 `assertJsonSerializable()`、`stringifyJson()` 与 `parseJson()`；错误必须包含页面路由、精确属性路径、插件身份（若由 `pageData()` hook 引入）和可执行的修复说明。嵌入生成模块的 JSON 同时转义 `<`、U+2028 与 U+2029，不能破坏 SFC script 或 JavaScript 源码边界。

nagi 通过 frontmatter 的 `layout` 区分页面：未填写时为 `doc`，`home` 用于落地页，`page` 用于无文档框架的普通自定义页。只有 `doc` 页面显示并进入自动侧边栏。任何 `index.md` 都不因文件名获得隐藏侧边栏的特权；首页文档显式填写 `layout: home`。`home` frontmatter 提供与现代文档站一致的结构化 `hero`、`hero.actions` 和 `features` 字段；nagi 分别用 Home、HomeHero 与 HomeFeatures 组件渲染，Hero 在桌面端使用左侧信息和右侧图片的双栏结构，在小屏幕上纵向排列，并把图片与其背后的渐变光晕作为两个独立图层；右侧图片是与左侧标题相当的主视觉，不能缩成辅助性图标。首页仍可在结构化区域之后渲染额外 Markdown 内容。nagi 的站点 Logo 与 Hero 图片同时接受单一图片或 `{ light, dark, alt }` 明暗图片；两张图片都进入 SSR HTML，再由当前 `color-scheme` 的 CSS 选择显示，不能在客户端读取媒体查询后临时换图。nagi 默认复用当前 `themeConfig.logo` 作为 favicon：单图生成一个 SSR `<link rel="icon">`，明暗图片生成带 `prefers-color-scheme` media 的两条 link，并统一应用站点 `base`，不要求官方文档再维护第三份 Logo 资源。没有 Markdown 正文的结构化首页由 Core 输出稳定的隐藏页面根节点，保证 SSR 与客户端 hydration 的节点结构一致。

nagi 的 `doc` 使用固定视口应用壳：NavBar 下方由 Sidebar 与正文滚动容器占满剩余高度，页面外壳和 `body` 不滚动，长正文只在右侧内容区域滚动；Sidebar 菜单过长时在自己的区域内滚动。`doc` 不渲染 Footer。正文末尾根据当前已解析 Sidebar 的叶子链接顺序显示上一篇与下一篇，跨顶层分组时仍连续翻页；不显示 Edit this page on GitHub 或更新时间区域。`home` 与 `page` 在 nagi 自己的页面滚动容器内滚动并渲染 Footer；未命中页面按 `page` 布局处理。Footer 默认显示本地化的 MIT 许可与 KawaPress 驱动信息，年份由运行时当前年份生成：中文为“基于 MIT 许可发布”和“© {year} KawaPress 强力驱动”，英文为“Released under the MIT License”和“© {year} Powered by KawaPress”。

nagi 的主要滚动区域统一使用基于 `overlayscrollbars-vue` 的 `OsScroll`，配置 `os-theme-nagi`、离开时自动隐藏、轨道点击滚动和 6px 圆角滑块。正文、Sidebar、Home/Page 页面不得暴露操作系统原生滚动条外观。代码块、浮层等无法包裹组件的嵌套原生滚动区使用同一套 CSS scrollbar fallback，颜色与深浅色主题变量保持一致。

nagi 只有一个由 Runtime Plugin 静态导入的 `theme.css` 主题入口；它按顺序导入 `styles/vars.css`、`styles/base.css`、`styles/layout.css`、`styles/content.css` 与 `styles/responsive.css`。主题 SFC 负责结构、状态和无障碍语义，不存放非 scoped 全局样式；稳定的主题组件 class 统一使用 `.nagi-*` 命名空间并集中维护，方便用户覆盖。Markdown 排版只作用于 `.nagi-doc` 边界，按照 VitePress 默认主题的标题、段落、列表、引用、表格、行内代码和代码块节奏适配，不把正文行高泄漏到整个应用或第三方 Vue 组件。代码块与 Code Group 在所有断点都保持与正文相同的左右内边距和圆角，不向视口左右边缘拉满；独立代码块与 Code Group 外壳使用 1px 主题分隔色边框，让浅色模式的代码区域能从页面背景中轻微分离，Code Group 内部代码块不重复套框。NavBar 在桌面端提供语言菜单、明暗模式切换按钮，以及可选的 GitHub 图标链接。语言菜单默认只显示图标，点击后弹出浮层列出全部语言，当前语言高亮。明暗模式未选择时跟随系统，用户点击后在 `light` 与 `dark` 间切换并保存到浏览器。可选的 `themeConfig.githubUrl` 在 NavBar 右侧增加 GitHub 图标链接，首页 Hero 不重复展示 GitHub 行动按钮。小于 60rem 时，NavBar 右侧只保留菜单按钮；点击后从 Header 下方向下渐变展开导航区，展示语言列表、明暗切换与 GitHub 链接，展开区域不得盖住顶部 Header。Runtime Plugin 在客户端模块求值、Vue hydration 之前恢复保存的根元素 class；图标与明暗图片始终保持相同 DOM 节点，只通过 CSS 切换显示，不能根据客户端状态条件渲染不同节点。

nagi 文档布局使用两级响应式断点：小于 60rem 时隐藏桌面 Sidebar，在正文工具条显示 Menu 并用带遮罩的左侧抽屉承载全站目录；60rem 至 80rem 保留桌面 Sidebar，只在工具条显示当前页目录；80rem 及以上隐藏工具条，在正文右侧显示独立当前页目录。文档正文默认最大宽度为 54rem；右侧目录退出布局时，正文可以使用释放后的目录宽度，最大扩展到 70rem。宽屏右侧目录默认展开，目录右上角提供无边框的面板收起图标；收起后目录完全退出布局，正文最大宽度同步使用释放出的全部空间，并在导航栏下方、距视口右上边缘留有安全间距的位置固定显示另一个无边框面板展开图标；没有可显示标题的页面直接回收目录空间。收起状态在当前 Vue App 的站内跳转期间保留，重新加载页面后恢复默认展开。Menu 抽屉、NavBar 导航展开区、目录下拉和遮罩必须支持 Escape、焦点、`aria-expanded`、路由后关闭及 `prefers-reduced-motion`。nagi只定义一次必填的 `ResolvedNagiThemeConfig`，公开的 `NagiThemeConfig` 由 `Partial<ResolvedNagiThemeConfig>` 得到。nagi根据 Core 当前 locale 的 `lang` 内置中文与英文的 `sidebarMenuLabel`、`navMenuLabel`、`outlineLabel`、`returnToTopLabel`、`langMenuLabel`、`previousPageLabel` 和 `nextPageLabel`；其他语言回退英文。用户无需在 `kawapress.config.ts` 重复配置内置语言文案，但仍可在顶层或 locale 的 `themeConfig` 中按需覆盖。nagi 不建立主题私有虚拟配置模块。

Markdown 编译阶段为 h1 至 h6 输出稳定、去重的 `id` 与 `.header-anchor` 永久链接；pageData outline 收集 h1 至 h3，nagi 当前页目录排除页面 h1 并递归显示 h2/h3。目录链接必须指向真实标题锚点，不能只生成无目标的 UI。目录根据正文滚动容器的当前位置高亮对应章节，左侧指示条落在 active 标题旁；移动端工具条下拉目录与桌面右侧目录使用同一套高亮。SSR 与 hydration 初始状态默认把第一个可显示标题设为 active 并显示指示条，浏览器接管后再按实际滚动位置更新，不能从“无 active”闪变为“有 active”。URL 带标题 hash 刷新时，nagi 在 SSR `<head>` 注入内容固定的同步初始化脚本：脚本在正文首次绘制前读取 `location.hash`，并在对应目录链接出现时把 active 与 `aria-current` 移到准确条目；客户端 setup 读取同一初始化结果，使 hydration 与预先调整后的 DOM 一致。

KawaPress Core 内置基于路径的国际化模型，与文件路由直接对齐：`root` 表示无语言前缀的默认内容，其他 locale key 对应 `/<locale>/` 路径前缀。当前语言只由当前路由决定，不维护第二份可漂移的 locale 状态。官方文档以中文为 `root`，例如 `/guide`；英文使用 `en`，例如 `/en/guide`。locale 可覆盖 `label`、`lang`、`dir`、`link`、`title` 与泛型 `themeConfig`；当前主题配置由顶层 `themeConfig` 与 locale 的 `themeConfig` 浅合并。Core 公开响应式的 `useSite()`、`useThemeConfig()` 与 `useLocale()`，其中 `useLocale()` 提供当前语言、语言列表和保留当前相对页面的语言链接。SSR、hydration 与客户端导航使用同一套路径解析，SSR/SSG 同时把当前 `lang`、`dir` 写入 `<html>`。主题负责声明自己的 ThemeConfig 类型、默认文案与语言菜单界面，但不得自行解析 URL、维护当前语言或建立私有语言数据通道；用户通过每个 locale 的 `themeConfig` 覆盖主题文案。nagi必须提供语言切换入口，并优先跳到目标语言下的同一相对页面。

站点数据、locale 配置、themeConfig 与 pageData 作为可序列化数据进入 Runtime graph。生成侧的函数、类实例与文件句柄不能进入浏览器。

## 九、仓库与工程规范

仓库使用 pnpm monorepo。

0.1 至少包含：

```text
packages/kawapress
packages/preset-nagi
docs
```

工程约定：

- 全仓库使用 TypeScript 6。
- Vue 代码使用 Composition API、`<script setup>` 与 TypeScript。
- 依赖版本通过具名 pnpm catalogs 管理，禁止裸 `catalog:`。
- 0.1 官方包直接发布 TypeScript、Vue SFC 与 CSS 源码，不执行独立的 package build；CLI 源码入口由 Jiti 加载，站点配置及其 Generator Plugin 模块图由 Vite `runnerImport()` 加载并收集本地配置依赖，网站运行侧源码由 Vite 加载。
- 源码发布包使用标准 package exports：`types`、`import` 与 `default` 均指向源码，不使用自定义 `source` condition，也不使用旧式 `module` 字段或 condition。
- 第三方插件可以发布源码或预编译产物；KawaPress 不要求插件声明 `source` condition。预编译包将 `types` 指向声明文件，并将 `import`、`default` 指向 ESM 产物。
- KawaPress 不在 TypeScript、Vitest 或 Vite 中启用自定义 `source` condition。Vite 的 SSR plugin pipeline 单独使用 `module` condition，确保进入 Module Runner 的 Vue 依赖选择 ESM 入口；否则 dev SSR 会把 `@vue/server-renderer` 的 CommonJS 入口与 top-level await 放入同一执行图并触发 `ERR_AMBIGUOUS_MODULE_SYNTAX`。这是 SSR 依赖解析约束，不是插件 package exports 约定。
- Runtime Plugin 静态导入的 Vue SFC 与 CSS 由用户站点的 Vite 自动打包；用户不需要单独导入主题或插件 CSS。
- KawaPress 使用 `docs` 工作区维护并构建自己的真实文档，不保留独立 playground；根目录的 `pnpm dev`、`pnpm build` 与 `pnpm preview` 分别代理文档站命令。新增功能直接进入真实文档，文档写作与构建过程作为持续 dogfooding。
- 官方文档以中文 `root` 为默认语言，英文放在 `en`；两种语言使用完全相同的相对文件路径，使语言菜单始终能切换到对应页面。文档按用户指定的篇目逐篇撰写，每次同时交付中英文版本，不提前铺写整套章节。
- 中文文档使用自然、亲和、温暖的高语境表达，循序渐进地帮助用户理解；英文文档使用直接、明确、低语境的表达，不逐字翻译中文语序。两种语言传递相同事实，但根据各自语言习惯独立组织句子。
- 官方文档以 KawaPress 0.1 的预期终态为准，按正式发布后用户真正使用产品的方式编写，不暴露 `workspace:*`、未发布版本号、仓库内部代理命令等开发期临时状态。文档可以先于对应实现成文，但不得超出本文确定的 0.1 交付范围；功能完成后必须通过 `docs` dogfooding 校验文档中的命令、配置与行为。
- `packageManager: pnpm@11.22.0` 是 KawaPress 仓库开发与复现构建的固定工具链，不是 KawaPress 站点用户的运行时要求。用户包发布后可使用满足依赖要求的 npm、pnpm、Yarn 等包管理器；文档不得把 pnpm 11 写成框架硬性前提。
- 官方文档通过 GitHub Actions 构建并部署到 GitHub Pages；`main` 每次推送触发部署，CI 使用 `KAWAPRESS_BASE=/kawapress/`，上传 `docs/dist`，本地开发未设置该变量时继续使用根路径 `/`。
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
- Shiki 双主题高亮、Twoslash 与 Floating Vue 浮层。
- 独立 Code Group Plugin、可访问代码 Tab 与 nagi 默认样式。
- 文件路径路由、SSR 首屏和浏览器内导航。
- 页面路由元数据、nagi 自动侧边栏与独立的本地全文搜索索引。
- nagi 的 `doc`、`home` 与 `page` 布局语义、上一篇/下一篇导航及系统深浅色模式。
- Core 路径国际化、locale 站点数据、主题配置覆盖、语言同页切换与 SSR/SSG `lang`/`dir`。
- `docs` 只声明 `kawapress` 一个运行依赖，并通过 `kawapress/nagi` 使用默认 Preset 和公开能力，完成 dev、SSR、hydration 与静态构建闭环，同时包含至少两种语言用于国际化 dogfooding。

0.1 明确不包含：

- `addPage()` 或插件虚拟页面。
- Content Layer、远程内容源和 CMS。
- 版本化文档和博客能力。
- 默认 Plugin 热重载。
- 生成侧与浏览器之间的 RPC。
- Runtime 初始状态协议、SSR request context 和 render hooks。

## 十一、后续路线

### 0.2：文档站日常体验

- `create-kawapress` 脚手架。

### 0.3：内容与生态

- 类型化 Content Layer。
- frontmatter schema 与构建校验。
- 内容查询。
- 插件与 Preset 开发文档、脚手架和发布规范。

### 后续

- 版本化文档。
- 博客、标签、RSS 与归档。
- CMS 与远程内容源。
- 在插件边界稳定后重新设计 Twoslash 浮层体验。
