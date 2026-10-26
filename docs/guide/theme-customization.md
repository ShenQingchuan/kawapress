---
title: 主题定制
description: 了解 KawaPress 主题的架构位置、组件约定和配置边界。
---

# 主题定制

在 KawaPress 中，主题不只是颜色和字体。它决定页面内容放在哪里，也决定导航栏、侧边栏、页脚和未找到页面怎样组成完整界面。

KawaPress 不内置这些界面。它只负责创建 Vue App、Vue Router 和 Markdown 页面，再把页面交给主题显示。

## 主题是一个普通 Plugin {#a-theme-is-a-regular-plugin}

KawaPress 没有单独的主题加载器，也没有只能由主题使用的生命周期。主题和搜索、代码高亮一样，都通过插件体系安装。

主题包遵循通用的[插件包 exports 约定](/guide/plugin-system#plugin-package-exports)：

```text
@example/kawapress-theme
├─ Generator Plugin
│  └─ 声明插件身份，并按需参与构建
└─ Runtime Plugin
   ├─ 注册 Layout 和 NotFound
   ├─ 注册其他主题组件
   └─ 导入主题样式
```

站点配置只加入 Generator Plugin，KawaPress 会自动加载同一个包里的 Runtime Plugin。

主题没有生成过程的工作时，Generator Plugin 可以保留空的 `setup()`。需要扫描内容目录、生成导航数据或调整 Vite 时，再在这里注册对应 Hook。nagi 就会在生成过程中读取侧边栏需要的目录信息。

Runtime Plugin 会同时用于服务端渲染和浏览器。主题组件和静态导入的依赖必须兼容这两个环境；浏览器专属代码请按 [SSR 兼容性](/guide/ssr-compatibility)中的方式处理。

## KawaPress 只约定两个组件 {#kawapress-requires-two-components}

主题必须注册两个全局组件：

| 组件 | 用途 |
| --- | --- |
| `Layout` | 所有路由共用的页面框架。 |
| `NotFound` | 当前 URL 没有对应页面时显示的内容。 |

组件名需要完全一致。除了这两个名字，KawaPress 不要求主题使用固定的组件结构。

导航栏、侧边栏、本页目录、页脚和首页组件都由主题自己组织。nagi 中的 `NavBar`、`Sidebar` 等名字不是 KawaPress 的通用扩展点，自定义主题不需要照搬。

### `Layout` 决定页面放在哪里 {#layout-places-the-current-page}

KawaPress 的根组件只渲染全局 `Layout`。主题需要在 `Layout` 中放置 `<RouterView />`，当前 Markdown 页面才会出现在界面里：

```vue
<script setup lang="ts">
import { RouterView } from 'kawapress/client'
</script>

<template>
  <div class="my-theme">
    <header>My Docs</header>
    <main class="my-theme-doc">
      <RouterView />
    </main>
  </div>
</template>
```

`Layout` 可以在 `RouterView` 外添加任意结构，也可以根据当前页面数据选择不同布局。KawaPress 不要求文档页、首页和普通页面使用相同框架。

### `NotFound` 只负责未匹配的页面 {#notfound-handles-unmatched-routes}

当 Vue Router 找不到对应路由时，`RouterView` 会显示全局 `NotFound`：

```vue
<script setup lang="ts">
import { useSite } from 'kawapress/client'

const site = useSite()
</script>

<template>
  <section class="my-theme-not-found">
    <h1>404</h1>
    <p>找不到页面</p>
    <a :href="site.link">返回首页</a>
  </section>
</template>
```

`NotFound` 仍然位于 `Layout` 里面，因此会继续使用主题的导航和整体样式。

## Outlet：插件把界面挂进主题 {#outlets}

插件不该知道是谁在渲染页面，主题也不该知道有哪些插件。两者通过 Outlet 对接：插件把一小块界面放进 Outlet，主题只决定这个 Outlet 出现在页面哪里。

KawaPress 提供 `KawaOutlet` 组件，并且已经把它注册为全局组件，主题模板里直接写名字就能用：

```vue
<script setup lang="ts">
import { RouterView } from 'kawapress/client'
</script>

<template>
  <div class="my-theme">
    <header>
      <span>My Docs</span>
      <KawaOutlet name="header.actions" />
    </header>
    <main>
      <RouterView />
      <KawaOutlet name="doc.after" />
    </main>
    <footer>
      <KawaOutlet name="doc.footer" />
    </footer>
  </div>
</template>
```

默认情况下，Outlet 按顺序渲染插件注册进来的组件，外面不会多包一层元素。如果主题需要筛选、排序或加外壳，就用作用域插槽：

```vue
<script setup lang="ts">
import { KawaOutlet } from 'kawapress/client'
</script>

<template>
  <KawaOutlet v-slot="{ items }" name="header.actions">
    <div class="my-theme-actions">
      <component :is="item.component" v-for="item in items" :key="item.id" />
    </div>
  </KawaOutlet>
</template>
```

每一项包含三个字段：`id` 是完整标识 `插件名:插件内部 id`，`owner` 是插件名，`component` 是插件提供的组件。想只显示部分插件时，按 `owner` 或 `id` 过滤即可。

首版有四个 Outlet：

| Outlet | 由谁渲染 | 常见内容 |
| --- | --- | --- |
| `header.actions` | 主题 | 搜索按钮、源码链接等顶栏操作 |
| `doc.header` | KawaPress | 复制页面、页面工具按钮 |
| `doc.footer` | 主题 | 最后更新时间、编辑此页链接 |
| `doc.after` | 主题 | 评论区、反馈表单 |

`doc.header` 由 KawaPress 自动放在 Markdown 内容的第一个 H1 后面，主题不需要自己写。没有 H1 的页面不会出现这个位置。

主题渲染了某个 Outlet，就表示支持它，不需要额外声明。两种诊断信息会帮你检查：同一个页面里重复渲染了同一个 Outlet 时，开发模式会打印一次警告；全站都没有渲染某个 Outlet，而插件已经往里放了内容时，`kawapress build` 会按插件各给一行警告。

## 最小主题包 {#a-minimal-theme-package}

一个可以被 KawaPress 自动加载的主题包，可以使用下面的结构：

```text
my-kawapress-theme/
├─ package.json
└─ src/
   ├─ index.ts
   ├─ runtime-plugin.ts
   ├─ Layout.vue
   ├─ NotFound.vue
   └─ theme.css
```

默认入口导出 Generator Plugin。没有生成过程扩展时，可以保留一个空的 `setup()`：

```ts
// src/index.ts
import { definePlugin } from 'kawapress'

export default function themePlugin() {
  return definePlugin({
    name: '@example/kawapress-theme',
    setup() {
      // 主题需要参与构建时，在这里注册 Hook。
    },
  })
}
```

`./runtime-plugin` 入口注册主题组件，并导入唯一的主题样式入口：

```ts
// src/runtime-plugin.ts
import { defineRuntimePlugin } from 'kawapress'
import Layout from './Layout.vue'
import NotFound from './NotFound.vue'
import './theme.css'

export default defineRuntimePlugin({
  name: '@example/kawapress-theme',
  setup(api) {
    api.vueApp((app) => {
      app.component('Layout', Layout)
      app.component('NotFound', NotFound)
    })
  },
})
```

站点只把默认 Generator Plugin 加入 `plugins`，不直接导入运行入口：

```ts
import themePlugin from '@example/kawapress-theme'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    themePlugin(),
  ],
})
```

一个站点只应该安装一个负责 `Layout` 和 `NotFound` 的主题。其他界面能力可以继续作为普通 Plugin 加入。

## `themeConfig` 由主题定义 {#the-theme-defines-themeconfig}

KawaPress 不解释 `themeConfig` 里的字段。主题可以根据自己的组件和交互，定义一套带类型的配置：

```ts
export interface MyThemeConfig {
  logo?: string
  menuLabel?: string
  sidebar?: Array<{
    text: string
    link: string
  }>
}
```

站点使用 `defineConfig<MyThemeConfig>()` 获得配置提示：

```ts
import type { MyThemeConfig } from '@example/kawapress-theme'
import themePlugin from '@example/kawapress-theme'
import { defineConfig } from 'kawapress'

export default defineConfig<MyThemeConfig>({
  themeConfig: {
    logo: '/logo.svg',
    menuLabel: '菜单',
  },
  plugins: [
    themePlugin(),
  ],
})
```

主题组件通过 `useThemeConfig()` 读取当前配置：

```ts
import type { MyThemeConfig } from '@example/kawapress-theme'
import { useThemeConfig } from 'kawapress/client'

const theme = useThemeConfig<MyThemeConfig>()
```

`useThemeConfig()` 会跟随当前路由更新。主题不需要自己解析 URL，也不需要建立一份额外的运行时配置。

`themeConfig` 会进入服务端渲染和浏览器，因此只能保存可以序列化的数据。组件、函数、Vue ref 和类实例不应该放进去。

## 每种语言可以覆盖主题配置 {#each-language-can-override-theme-configuration}

顶层 `themeConfig` 保存各语言共用的配置。`locales` 中的 `themeConfig` 可以替换当前语言需要变化的字段：

```ts
import type { MyThemeConfig } from '@example/kawapress-theme'
import themePlugin from '@example/kawapress-theme'
import { defineConfig } from 'kawapress'

export default defineConfig<MyThemeConfig>({
  themeConfig: {
    logo: '/logo.svg',
    menuLabel: 'Menu',
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en',
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        menuLabel: '菜单',
      },
    },
  },
  plugins: [
    themePlugin(),
  ],
})
```

KawaPress 会浅层合并这两份配置。上面的中文页面会保留顶层 `logo`，并把 `menuLabel` 换成“菜单”。

浅层合并不会继续合并嵌套对象。如果某个语言提供了 `labels`，整个 `labels` 字段都会替换。主题可以使用较扁平的配置，或在自己的解析函数中补齐默认值。

## 页面展示规则属于主题 {#page-presentation-rules-belong-to-the-theme}

Frontmatter 会完整保留在页面数据中，主题可以为自己的界面定义页面级字段：

```ts
import { usePageData } from 'kawapress/client'
import { computed } from 'vue'

const page = usePageData()
const layout = computed(() =>
  page.value?.frontmatter.layout ?? 'doc',
)
```

例如，nagi 会解释 `layout`、`hero`、`features`、`sidebar` 和 `outline`。这些是 nagi 的约定，不是所有 KawaPress 主题都必须支持的字段。

自定义主题可以定义完全不同的布局名称和页面选项，但应该把这些字段写进自己的类型和文档。Frontmatter 仍然只能保存可以序列化的数据。

## 主题从公开客户端 API 获取数据 {#themes-use-the-public-client-api}

主题组件从 `kawapress/client` 使用公开能力：

| API | 主题可以读取或操作的内容 |
| --- | --- |
| `usePageData()` | 当前页面的路径、标题、Frontmatter 和标题目录。 |
| `useSite()` | 当前语言下的站点标题、`base`、`lang`、`dir` 和首页链接。 |
| `useThemeConfig()` | 当前语言合并后的主题配置。 |
| `useLocale()` | 当前语言、语言列表和对应页面链接。 |
| `useRouter()` | KawaPress 使用的 Vue Router 实例。 |
| `RouterLink`、`RouterView` | 站内导航与当前路由内容。 |
| `KawaOutlet` | 插件注册进当前 Outlet 的界面。 |
| `withBase()` | 为动态的公共资源地址加上部署路径。 |

主题不应导入 KawaPress 内部文件，也不应自己维护另一套路由或语言状态。这样，服务端渲染、hydration 和站内跳转会使用同一份数据。

### 列出全站页面做导航 {#list-pages-for-navigation}

`usePageData()` 只返回当前页面。要列出其他页面，例如自动侧边栏、上一篇与下一篇，请读取每个路由的元数据 `route.meta.page`，它的类型是 `PageRouteMeta`：

```ts
import { useRouter } from 'kawapress/client'
import { computed } from 'vue'

const router = useRouter()
const pages = computed(() =>
  router.getRoutes()
    .map(route => route.meta.page)
    .filter(page => page !== undefined),
)
```

每个 `PageRouteMeta` 只有三个字段：`path`（公开路由）、`title`（页面标题）和可选的 `layout`（Frontmatter 中的 `layout` 字符串）。这些摘要随路由清单一起进入浏览器，体积很小；页面的正文、其余 Frontmatter 字段和标题目录只在该页面被访问时才加载。

路由摘要来自作者写下的 Frontmatter 和第一个一级标题，不经过 Markdown 渲染，也不执行插件的 `pageData()`。需要更多字段时，按 Generator Plugin 的方式用 `vite()` 发布自己的虚拟模块，例如 nagi 的 `_meta.json` 模块。

## 在 Runtime Plugin 中导入主题样式 {#import-theme-styles-from-the-runtime-plugin}

主题的 Runtime Plugin 直接导入 CSS。KawaPress 会把它同时放进服务端和浏览器构建，不需要站点用户再手动导入主题样式。

建议只保留一个主题 CSS 入口，再由它组织变量、基础样式、布局、正文排版和响应式规则：

```css
/* theme.css */
@import './styles/vars.css';
@import './styles/base.css';
@import './styles/layout.css';
@import './styles/content.css';
```

主题样式应该使用自己的 class 前缀，并把 Markdown 排版限制在明确的正文容器内。不要让全局选择器意外改变用户写在 Markdown 中的 Vue 组件。

明暗模式、响应式布局和交互视觉也由主题负责。KawaPress 会提供当前页面和语言数据，但不会替主题决定这些界面行为。

## 公共 Token 与样式层级 {#shared-tokens-and-css-layers}

主题和插件都需要颜色、字体和圆角。这类数值由 KawaPress 统一命名为 Token，统一提供默认值，主题只负责覆盖。每个页面的 `<head>` 最前面都有两层注入内容，开发环境和构建结果一致：

```html
<style id="kawa-layers">@layer kawa.base, kawa.plugin, kawa.theme;</style>
<style id="kawa-tokens">@layer kawa.base { :root { --kawa-c-bg: light-dark(#ffffff, #1b1b1f); /* … */ } }</style>
```

三个层级的优先级由低到高排列：

| 层 | 放什么 |
| --- | --- |
| `kawa.base` | KawaPress 的默认 Token，以及主题的全局重置 |
| `kawa.plugin` | 插件自带的默认样式 |
| `kawa.theme` | 主题的全部样式 |
| 不在任何层里的样式 | 站点使用者自己写的 CSS，优先级最高 |

因此主题样式永远盖过插件样式，与 CSS 文件的加载顺序无关；站点使用者想改主题时，写普通 CSS 就够了，不需要 `!important`。

官方内容插件（代码块、代码组、自定义容器、GitHub 警报、数学公式）都自带一套默认样式，放在 `kawa.plugin` 层里，只读取公共 Token。它们不依赖任何主题就能使用；主题通常只需要在 `kawa.theme` 层里微调间距、圆角或颜色，不用从零重写插件外观。

需要注意的是，`@layer` 的优先级高于选择器权重，所以主题的全局重置（`margin: 0`、`padding: 0`、`border: 0` 这类）不能写进 `kawa.theme`，否则会连插件的内边距一起清掉。把重置单独放一个文件，用 `layer(kawa.base)` 导入即可：

```css
/* theme.css */
@import './styles/preflight.css' layer(kawa.base);
@import './styles/theme.css';
```

这样重置仍然作用于整个页面，插件样式却能盖过它，插件不需要和主题的重置搏斗。

默认 Token 使用 `light-dark()` 编写，`color-scheme: light dark` 也声明在 `kawa.base` 层里，所以不装主题也有可用的浅色和深色外观：

| Token | 用途 |
| --- | --- |
| `--kawa-c-bg` | 页面背景 |
| `--kawa-c-bg-soft` | 次级表面，例如代码块、悬停底色 |
| `--kawa-c-bg-elv` | 浮起表面，例如对话框、弹出层 |
| `--kawa-c-border` | 控件边框 |
| `--kawa-c-divider` | 分隔线 |
| `--kawa-c-text-1` | 主要文字 |
| `--kawa-c-text-2` | 次要文字 |
| `--kawa-c-text-3` | 三级文字、占位文字 |
| `--kawa-c-brand` | 品牌色、链接、焦点环 |
| `--kawa-c-info` / `--kawa-c-success` / `--kawa-c-warning` / `--kawa-c-danger` | 四种状态色 |
| `--kawa-font-sans` / `--kawa-font-mono` | 正文字体、等宽字体 |
| `--kawa-radius` | 控件默认圆角 |
| `--kawa-shadow-overlay` | 浮层阴影 |

主题覆盖 Token 时只需要重写变量，不用复制插件样式：

```css
@layer kawa.theme {
  :root {
    --kawa-c-brand: light-dark(#b3005c, #ff8ab8);
    --kawa-radius: 10px;
  }
}
```

主题自己的样式请整体放进 `kawa.theme` 层，这样插件样式和主题样式谁更强一目了然。引入第三方 CSS 时也必须指定层，否则它会落在无层级样式里，反过来盖住主题：

```css
@import url('overlayscrollbars/styles/overlayscrollbars.css') layer(kawa.theme);
```

漏掉 `layer()` 的第三方 CSS 是主题里最常见的优先级事故，导入前先确认这一点。
