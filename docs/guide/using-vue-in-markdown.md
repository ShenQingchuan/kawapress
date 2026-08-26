---
description: 在 Markdown 页面中使用 Vue 表达式、指令、组件和单文件组件能力。
---

# 在 Markdown 中使用 Vue

KawaPress 会把每个 Markdown 页面编译成 Vue 单文件组件。普通 Markdown 负责文章结构，需要动态内容时，可以直接使用 Vue 模板语法、单文件组件区块和局部组件。

::: warning SSR 兼容性
页面中的动态代码会同时参与服务端渲染和浏览器 hydration。访问浏览器 API 或使用仅支持客户端的依赖前，请先阅读 [SSR 兼容性](/guide/ssr-compatibility)。
:::

## 模板语法

### 插值

正文中的双花括号会作为 Vue 表达式执行：

```md
2 + 2 = **{{ 2 + 2 }}**
```

实际结果是：2 + 2 = **{{ 2 + 2 }}**。

插值适合简短、没有副作用的表达式。状态和复杂逻辑应该移到 `<script setup>`，让正文继续容易阅读。

### 指令

Markdown 中可以直接写 HTML，也可以使用 Vue 指令：

```md
<span v-for="number in 3" :key="number">{{ number }}</span>
```

实际结果是：<span v-for="number in 3" :key="number">{{ number }}</span>。

`v-if`、`:class`、`@click` 等指令也遵循普通 Vue 模板规则。

## 安装 Vue

只写 Markdown 并使用 nagi 时，项目只需要安装 `kawapress`。如果要编写 Vue 组件，或从 `vue` 导入响应式 API，请把 Vue 明确安装为项目的开发依赖：

::: code-group
```sh [npm]
npm install --save-dev vue
```

```sh [pnpm]
pnpm add --save-dev vue
```

```sh [Yarn]
yarn add --dev vue
```
:::

这样，编辑器和包管理器都能准确知道站点直接使用了 Vue。

## `<script>` 与 `<style>`

Markdown 文件支持根级的 `<script>`、`<script setup>` 和 `<style>` 区块。它们要放在 frontmatter 之后。页面不需要再写 `<template>`，其余 Markdown 内容就是组件模板。

下面的页面使用 `<script setup>` 管理状态，并用 CSS Module 添加页面局部样式：

```md
---
title: 计数器
---

<script setup lang="ts">
import { computed, shallowRef } from 'vue'

const count = shallowRef(1)
const doubled = computed(() => count.value * 2)
</script>

# 计数器

<p :class="$style.summary">
  当前数值：{{ count }}，两倍是 {{ doubled }}。
</p>

<button type="button" @click="count++">增加</button>

<style module>
.summary {
  font-weight: 600;
}
</style>
```

页面级样式优先使用 `<style module>`。与 `<style scoped>` 相比，它不需要给整篇 Markdown 生成的每个元素追加 scoped 属性。需要跨页面共享的样式，应该放进主题或 Runtime Plugin 的 CSS 入口。

## 使用组件

### 导入局部组件

假设页面旁边有一个计数器组件：

```text
components/
└─ Counter.vue
guide/
└─ interactive.md
```

`components/Counter.vue` 可以使用普通的 Vue 3 单文件组件写法：

```vue
<script setup lang="ts">
import { shallowRef } from 'vue'

const count = shallowRef(0)
</script>

<template>
  <button class="counter" type="button" @click="count++">
    点击次数：{{ count }}
  </button>
</template>

<style scoped>
.counter {
  padding: 0.5rem 0.75rem;
  color: inherit;
  font: inherit;
  cursor: pointer;
  background: transparent;
  border: 1px solid currentcolor;
  border-radius: 0.5rem;
}
</style>
```

然后在 `guide/interactive.md` 中，通过 `<script setup>` 显式导入它：

```md
<script setup lang="ts">
import Counter from '../components/Counter.vue'
</script>

# 交互示例

<Counter />
```

导入路径相对于当前 Markdown 文件。组件的 props、事件和插槽都遵循普通 Vue 规则。组件名应使用 PascalCase，例如 `<Counter />`。

局部导入可以让组件跟随页面拆分，只在访问相关页面时加载。KawaPress 不会自动注册某个组件目录；只有大多数页面都要使用的组件，才适合通过 Runtime Plugin 注册为全局组件。

## 访问当前页面数据

从 `kawapress/client` 导入 `usePageData()`，可以读取当前页面的标题、路径、frontmatter 和标题列表：

```md
<script setup lang="ts">
import { usePageData } from 'kawapress/client'

const page = usePageData()
</script>

当前页面标题：{{ page?.title }}
```

`usePageData()` 会随站内导航更新。KawaPress 不把全站页面内容发送到浏览器。

## 转义 Vue 语法

需要原样显示双花括号时，可以使用 `v-pre`：

```md
<span v-pre>{{ 这里不会执行 }}</span>
```

实际结果是：<span v-pre>{{ 这里不会执行 }}</span>。

代码围栏默认已经受到保护，里面的 Vue 表达式不会执行，不需要再手动添加 `v-pre`。
