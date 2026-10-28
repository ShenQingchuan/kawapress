---
title: 主题开发
description: 了解 KawaPress 的主题架构、插座插头模型、必要组件约定与配置扩展。
---

# 主题开发

在 KawaPress 中，主题决定页面的结构与排版骨架：顶栏在哪里、正文放在哪里、侧边栏如何展现以及 404 页面怎样渲染。

与其他静态站点生成器不同，KawaPress 坚持两项核心设计哲学：
1. **主题也是一个 Plugin**：KawaPress 没有独立于插件之外的“主题加载器”，主题通过相同的插件包机制进行分发和安装。
2. **插座与插头模型（Outlet 机制）**：主题负责搭骨架并留出插座（`<KawaOutlet>`），插件负责提供功能组件插进插座。两者互不引用、零耦合。

## 页面骨架与 Outlet 分布 {#page-frame-and-outlets}

一个典型的 KawaPress 文档页面由主题布局组件、核心正文渲染区和八个标准插座（Outlet）共同组织。

### 命名规则 {#outlet-naming}

Outlet 的名字由「范围 + 位置」组成，不写里面放什么：

- `layout` 表示整个页面框架，`doc` 表示正在阅读的这一篇文档。
- `start` 和 `end` 指阅读方向的起点和终点：中文、英文里起点在左，阿拉伯语里在右，会自动镜像，所以名字里不用 `left` 和 `right`。
- 名字按角色取，不按像素方位取：侧边栏叫 `sidebar`，不叫 `left`。

### 八个标准 Outlet {#standard-outlets}

每个 Outlet 圈住主题画的一块内容。主题把这块内容包进 `<KawaOutlet>`，插件就能在它的前面或后面加东西。

| Outlet 名称 | 圈住的内容（nagi 主题） | 谁来放置 | 常见贡献 |
| :--- | :--- | :--- | :--- |
| `layout.header` | 整条顶栏 | 主题 | 前置：公告横幅 |
| `layout.header.start` | Logo 与站点名 | 主题 | 后置：版本选择器 |
| `layout.header.end` | 语言菜单、外观切换、GitHub 链接 | 主题 | 前置：搜索按钮 |
| `layout.sidebar` | 导航树 | 主题 | 前置：站点切换，后置：赞助入口 |
| `layout.footer` | 版权文字 | 主题 | 后置：备案号 |
| `doc` | 正文与上下篇导航 | 主题 | 后置：最后更新时间、评论区 |
| `doc.under-title` | 空，Markdown 首个 `<h1>` 之后 | **KawaPress 自动放置** | 复制正文按钮、阅读时间 |
| `doc.toc` | 文档大纲 | 主题 | 后置：返回顶部 |

> **提示**：除了 `doc.under-title` 是核心解析 Markdown 时自动注入外，其余七个 Outlet 都由主题在自己的 Vue 模板中摆放。主题不一定实现全部八个：没有实现的 Outlet，插件放进去的内容不会显示，构建结束时会给出一行警告。

## 主题与插件如何解耦协作？ {#how-they-collaborate}

主题与插件之间没有直接的依赖链。协作流程如下：

1. **用户在配置中声明插件**：在 `kawapress.config.ts` 的 `plugins` 数组中同时列出主题和各种功能插件（如搜索、评论）。
2. **主题圈出 Outlet**：主题的 `Layout.vue` 把自己的组件包进 `<KawaOutlet name="...">`，这块内容就是这个 Outlet 的默认内容。
3. **插件选择前置还是后置**：插件在运行侧入口（`runtime-plugin.ts`）里调用 `api.prependToOutlet()` 把组件放到默认内容前面，或调用 `api.appendToOutlet()` 放到后面。
4. **运行时统一组装**：同一个位置有多个插件时，按 `plugins` 数组里的顺序依次排下去。

最终顺序是：前置的插件内容，主题的默认内容，后置的插件内容。

### 职责边界清单 {#responsibilities}

| 角色 | 必须负责的事 | 严禁越界做的事 |
| :--- | :--- | :--- |
| **主题 (Theme)** | <ul><li>提供全局 `Layout.vue` 与 `NotFound.vue`</li><li>把自己画的内容包进 `<KawaOutlet>`</li><li>定义设计变量（CSS Tokens，基于 `--kawa-*`）</li></ul> | <ul><li>不硬编码内置具体业务功能（如强行内置搜索弹窗或评论系统）</li><li>不侵入 Markdown 编译器修改文档 HTML</li></ul> |
| **插件 (Plugin)** | <ul><li>实现独立的业务逻辑和 UI 组件</li><li>通过 `api.prependToOutlet()` 或 `api.appendToOutlet()` 把组件挂入 Outlet</li><li>默认样式写在 `@layer kawa.plugin` 并使用 `--kawa-*` 变量</li></ul> | <ul><li>不写死像素级宽度和假定特定的主题 DOM 容器</li><li>不覆盖主题的基础全局样式</li><li>不直接修改主题私有变量（如 `--nagi-*`）</li></ul> |
| **核心 (Core)** | <ul><li>创建 Vue 应用实例与站内路由</li><li>渲染当前页面的 Markdown 内容至 `<RouterView />`</li><li>自动在首个 H1 后挂载 `doc.under-title`</li><li>按插件配置顺序分发各个 Outlet 的内容并进行校验警告</li></ul> | <ul><li>不自带硬编码的顶栏、侧边栏或样式主题</li><li>把所有页面布局呈现权交由主题</li></ul> |

## 主题必须约定的两个组件 {#kawapress-requires-two-components}

主题必须注册两个全局组件：

| 组件 | 用途 |
| --- | --- |
| `Layout` | 所有路由共用的页面框架。必须包含 `<RouterView />` 供正文展示。 |
| `NotFound` | 当 URL 没有对应页面时显示的内容。 |

除了这两个名字，KawaPress 不对主题组件做任何额外强制。导航栏、侧边栏、目录结构等完全由主题自由组织。

### 1. `Layout.vue` 放置正文与 Outlet {#layout-component}

在主题的 `Layout.vue` 中，直接使用全局注册的 `<RouterView />` 和 `<KawaOutlet>`。把原本要画的内容放进 `<KawaOutlet>` 里，它就成了这个位置的默认内容：

```vue
<!-- Layout.vue -->
<script setup lang="ts">
import { RouterView } from 'kawapress/client'
</script>

<template>
  <div class="my-theme-layout">
    <header class="navbar">
      <div class="logo">
        My Docs
      </div>
      <div class="actions">
        <KawaOutlet name="layout.header.end">
          <ThemeSwitch />
        </KawaOutlet>
      </div>
    </header>

    <main class="content">
      <KawaOutlet name="doc">
        <!-- Markdown 正文显示在此处（核心会自动在 H1 下挂载 doc.under-title） -->
        <RouterView />
      </KawaOutlet>
    </main>
  </div>
</template>
```

`<KawaOutlet>` 本身不会生成额外的 DOM 元素。需要外壳时，把外壳写在它的里面或外面都可以，由主题决定。

> 一个 Outlet 在同一个页面里只写一次。同一个名字出现两次，每个插件的内容也会出现两次，开发模式下会给出警告。

### 2. `NotFound.vue` 负责未匹配页面 {#notfound-component}

当路由在页面表里找不到对应页面时，`RouterView` 会显示全局 `NotFound`：

```vue
<!-- NotFound.vue -->
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

## 最小主题包结构 {#a-minimal-theme-package}

一个标准的主题 npm 包结构如下：

```text
my-kawapress-theme/
├─ package.json
└─ src/
   ├─ index.ts           默认入口：Generator Plugin
   ├─ runtime-plugin.ts  运行入口：Runtime Plugin
   ├─ Layout.vue
   ├─ NotFound.vue
   └─ theme.css
```

### 1. `package.json`
公开两个标准入口：

```json
{
  "name": "@example/kawapress-theme",
  "type": "module",
  "version": "0.1.0",
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
  "peerDependencies": {
    "kawapress": "^0.0.1"
  }
}
```

### 2. 生成侧入口（`src/index.ts`）
没有构建逻辑时，提供一个空的 `setup()` 即可；若需解析目录结构或注册 Vite 配置，可在这里调用生成侧钩子：

```ts
// src/index.ts
import { definePlugin } from 'kawapress'

export default function myTheme() {
  return definePlugin({
    name: '@example/kawapress-theme',
    setup(api) {
      // 需要参与构建时，在这里注册 Hook
    },
  })
}
```

### 3. 运行侧入口（`src/runtime-plugin.ts`）
注册必须的两个组件，并导入主题样式：

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

## `themeConfig` 类型扩展 {#theme-config}

KawaPress 不主动解释 `themeConfig` 的字段。主题可以把自己的配置字段扩展到 KawaPress 的 `ThemeConfig` 接口上，站点使用者就能在 `defineConfig()` 里享受到类型提示与校验：

```ts
// src/index.ts
declare module 'kawapress' {
  interface ThemeConfig {
    logo?: string
    githubUrl?: string
    sidebar?: Array<{
      text: string
      link: string
    }>
  }
}
```

站点在 `kawapress.config.ts` 中使用：

```ts
import myTheme from '@example/kawapress-theme'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    myTheme(),
  ],
  themeConfig: {
    logo: '/logo.png', // 获得良好的自动补全和类型检查
  },
})
```

在主题组件中通过 `useThemeConfig()` 即可实时读取配置：

```vue
<script setup lang="ts">
import { useThemeConfig } from 'kawapress/client'

const themeConfig = useThemeConfig()
</script>

<template>
  <img v-if="themeConfig?.logo" :src="themeConfig.logo" alt="logo">
</template>
```

## 样式设计约定 {#styling}

- **使用标准 Token**：读取并使用 `--kawa-*` 系列 CSS 变量（如 `--kawa-c-brand`、`--kawa-c-bg`、`--kawa-c-text-1` 等）。这样插件能够自动融入主题的外观。
- **让插件样式可覆盖**：插件的样式默认位于 `@layer kawa.plugin`，主题自己的样式在默认层级中无需使用 `!important` 即可自然覆盖插件外观。

完整的官方参考实现可查看代码库中的测试夹具：[`e2e/fixtures/reference-theme`](https://github.com/kawapress/kawapress/tree/main/e2e/fixtures/reference-theme)。
