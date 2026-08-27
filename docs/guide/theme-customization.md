---
title: 主题定制
description: 了解 KawaPress 主题的架构位置、组件约定和配置边界。
---

# 主题定制

在 KawaPress 中，主题不只是颜色和字体。它决定页面内容放在哪里，也决定导航栏、侧边栏、页脚和未找到页面怎样组成完整界面。

KawaPress 不内置这些界面。它只负责创建 Vue App、Vue Router 和 Markdown 页面，再把页面交给主题显示。

## 主题是一个普通 Plugin

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

## KawaPress 只约定两个组件

主题必须注册两个全局组件：

| 组件 | 用途 |
| --- | --- |
| `Layout` | 所有路由共用的页面框架。 |
| `NotFound` | 当前 URL 没有对应页面时显示的内容。 |

组件名需要完全一致。除了这两个名字，KawaPress 不要求主题使用固定的组件结构。

导航栏、侧边栏、本页目录、页脚和首页组件都由主题自己组织。nagi 中的 `NavBar`、`Sidebar` 等名字不是 KawaPress 的通用扩展点，自定义主题不需要照搬。

### `Layout` 决定页面放在哪里

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

### `NotFound` 只负责未匹配的页面

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

## 最小主题包

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

## `themeConfig` 由主题定义

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

## 每种语言可以覆盖主题配置

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

## 页面展示规则属于主题

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

## 主题从公开客户端 API 获取数据

主题组件从 `kawapress/client` 使用公开能力：

| API | 主题可以读取或操作的内容 |
| --- | --- |
| `usePageData()` | 当前页面的路径、标题、Frontmatter 和标题目录。 |
| `useSite()` | 当前语言下的站点标题、`base`、`lang`、`dir` 和首页链接。 |
| `useThemeConfig()` | 当前语言合并后的主题配置。 |
| `useLocale()` | 当前语言、语言列表和对应页面链接。 |
| `useRouter()` | KawaPress 使用的 Vue Router 实例。 |
| `RouterLink`、`RouterView` | 站内导航与当前路由内容。 |
| `withBase()` | 为动态的公共资源地址加上部署路径。 |

主题不应导入 KawaPress 内部文件，也不应自己维护另一套路由或语言状态。这样，服务端渲染、hydration 和站内跳转会使用同一份数据。

## 在 Runtime Plugin 中导入主题样式

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
