---
title: 插件体系
description: 了解 KawaPress 如何把跨越构建与运行的代码收拢成一个可以独立组合的能力。
---

# 插件体系

一个文档工具的扩展能力，通常从很小的需求开始。

也许你只是想加一个本地搜索。它需要先读取所有 Markdown，按标题切分内容，再生成搜索索引。到这里，事情都发生在构建过程中。

接着，网站里还要有搜索按钮和结果列表。它要响应键盘操作，跟随当前语言，并在读者选择结果后交给 Router 打开页面。这些需求又依赖 Vue 和浏览器能力。

从使用者的角度看，这始终只是一个功能：**搜索**。但在许多静态站点生成器里，它已经被拆成了几段需要分别接线的代码。

KawaPress 的插件体系，就是从这里开始设计的。

## 一个功能，却要到好几个地方配置

VitePress 提供了不少实用的扩展入口。你可以在配置中调整 Markdown，加入 Vite Plugin，也可以使用构建 Hook。到了最终网站，主题还能通过 `enhanceApp` 安装 Vue 插件和组件。

这些入口都很好用，也让 VitePress 保持了简单和灵活。但如果搜索同时用到了它们，你就要去好几个地方配置同一个功能，还要记住这些配置是怎样连在一起的。

功能只改 Markdown 时，这并不麻烦。等它还要生成数据、注册组件、导入样式和处理浏览器交互，插件作者就得自己把这些代码接起来，使用者也要照着说明，在配置和主题入口里分别安装。

所以，真正缺少的不是另一个 Hook，而是一种能告诉框架“这些代码都属于同一个插件”的办法。

## KawaPress 插件规范定义

生成索引和显示搜索界面，本来就应该在不同的地方完成。KawaPress 不会把它们硬塞进同一个运行环境，而是把它们装进同一个插件包：

```text
@kawapress/plugin-search
├─ Generator Plugin
│  └─ 扫描 Markdown，生成搜索索引
└─ Runtime Plugin
   └─ 注册搜索组件、样式和交互
```

KawaPress 把整个搜索能力称为一个 Plugin。这个 Plugin 可以包含两个互相配合的部分。

### Generator Plugin 参与构建生成过程

Generator Plugin 在 KawaPress 读取配置、编译 Markdown 和构建站点时工作。它可以：

- 修改站点配置；
- 扩展 Markdown 语法；
- 调整每个页面的数据；
- 接入 Vite Plugin 或修改 Vite 配置。

提示容器只需要改变生成的 HTML，因此只用 Generator Plugin 就够了。本地搜索需要在这里生成索引，代码高亮也需要在这里把源码变成最终标记。

### Runtime Plugin 参与页面运行环境

Runtime Plugin 在 KawaPress 创建 Vue App 和 Vue Router 时工作。它可以：

- 安装普通 Vue 插件；
- 注册全局组件；
- 导入运行时样式；
- 添加导航守卫和其他 Router 行为。

服务端渲染和浏览器都会加载 Runtime Plugin。搜索界面、代码复制和主题布局，都需要这一部分。使用浏览器 API 前，请先阅读 [SSR 兼容性](/guide/ssr-compatibility)。

### 插件包的 exports 约定 {#plugin-package-exports}

一个发布到 npm 的 Plugin 使用默认入口公开 Generator Plugin，并可以公开一个 `./runtime-plugin` 入口：

```json
{
  "name": "@kawapress/plugin-search",
  "type": "module",
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
    "src"
  ]
}
```

`package.json` 的 `name`、Generator Plugin 的 `name` 和 Runtime Plugin 的 `name` 应该保持一致。KawaPress 从站点配置中的 Generator Plugin 取得这个名字，再检查同名包是否公开了 `./runtime-plugin`。如果存在，运行入口会被自动加载。

只参与构建的 Plugin 不需要公开 `./runtime-plugin`。只参与页面运行环境的 Plugin 仍然需要默认入口，用 Generator Plugin 声明自己的稳定身份；它的 `setup()` 可以不注册任何 Hook。

站点始终只导入默认入口：

```ts
import searchPlugin from '@kawapress/plugin-search'

const plugins = [
  searchPlugin(),
]
```

不要让使用者再导入 `@kawapress/plugin-search/runtime-plugin`。生成与运行虽然发生在不同阶段，对外仍然是一次安装和一次配置。

### 推荐直接发布 TypeScript 源码

KawaPress Plugin 推荐使用 TypeScript 开发，并直接发布 `.ts`、`.vue` 和 CSS 源码，不需要先运行一次打包工具。

上面的 `exports` 已经是可以直接发布源码的写法。Generator Plugin 由 KawaPress 的 Vite Module Runner 加载；Runtime Plugin 及其导入的 Vue SFC 和 CSS 会进入站点的 Vite 模块图。最终的语法转换、依赖解析和浏览器构建都由 KawaPress 使用的 Vite 完成。

源码包使用标准的 `types`、`import` 和 `default` 条件即可，不需要额外声明 `source` condition。记得通过 `files` 把源码目录包含进 npm 包。

直接发布源码是推荐方式，不是硬性限制。已经编译为 ESM 的插件也可以使用，只需让 `types` 指向声明文件，让 `import` 和 `default` 指向 JavaScript 产物。

## 默认配置应当是一个足够好的产品

搜索、代码高亮、提示容器和主题都能独立安装以后，组合会更自由。但如果每个站点都要从零选择和连接它们，简单的文档站反而要先写一长串配置。

Preset 就是为了解决这个问题。

Preset 提供一套默认配置，并把多个 Plugin 组合成可以直接开始的完整体验：

```text
Preset
├─ 默认配置
└─ 一组有明确顺序的 Plugin
   ├─ 主题
   ├─ Markdown 能力
   ├─ 搜索
   └─ 其他默认能力
```

nagi（凪）就是 KawaPress 内置的 Preset。它准备好文档布局、代码高亮、提示容器、搜索、UnoCSS 等能力，所以站点只需要很少的配置就能开始：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'My Docs',
})
```

这里没有一个拥有特殊权限的“官方主题层”。nagi 的界面由 Runtime Plugin 安装，它组合的每项能力也都是普通 Plugin。官方自己使用的，就是第三方可以使用的公开入口。

## 在 Preset 上继续添加插件

使用 nagi 以后，仍然可以继续加入独立能力。下面的配置保留 nagi 的全部默认体验，同时增加 MathJax：

```ts
import mathjaxPlugin from '@kawapress/plugin-mathjax'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    mathjaxPlugin(),
  ],
})
```

Preset 内置的 Plugin 会先加入，你在 `plugins` 中填写的内容随后加入。数组顺序就是执行顺序：后面的 Plugin 能看到前面已经完成的修改，也可以有意覆盖它们。

KawaPress 不使用数字优先级，也不在背后猜测插件依赖。配置文件展示的顺序，就是能力实际组合的顺序。

如果要设计完全不同的界面，可以不使用 Preset，直接从 `defineConfig()` 开始：

```ts
import { defineConfig } from 'kawapress'
import themePlugin from 'my-kawapress-theme'
import markdownPlugin from 'my-markdown-plugin'

export default defineConfig({
  plugins: [
    themePlugin(),
    markdownPlugin(),
  ],
})
```

自定义主题 Plugin 需要注册 KawaPress 渲染页面所需的布局组件。更换 Preset，就是更换最外层的配置函数；配置中没有另一份需要叠加维护的 `presets` 列表。

## 从需求找到扩展位置

当你开始编写扩展时，可以先问“这项工作发生在哪里”：

| 想做的事 | 扩展位置 |
| --- | --- |
| 修改站点配置 | Generator Plugin 的 `config()` |
| 扩展 Markdown 语法 | Generator Plugin 的 `markdown()` |
| 修改每个页面的数据 | Generator Plugin 的 `pageData()` |
| 添加或调整 Vite 能力 | Generator Plugin 的 `vite()` |
| 安装 Vue 插件或全局组件 | Runtime Plugin 的 `vueApp()` |
| 添加导航守卫或运行时路由行为 | Runtime Plugin 的 `router()` |
| 提供一套可以直接开始的完整体验 | Preset |

一个能力可以使用表中的多个位置，但应该继续作为一个插件包交付。扩展点负责把工作放到正确的阶段，插件身份负责把这些工作重新收拢起来。
