---
description: 编写能同时安全运行在 KawaPress 服务端渲染和浏览器环境中的 Vue 代码。
---

# SSR 兼容性

KawaPress 在开发模式的每次首次请求和生产构建期间都会执行服务端渲染（SSR）。页面、组件和 Runtime Plugin 中的自定义代码，需要同时兼容 Node.js 与浏览器环境。

如果还不熟悉 SSR，可以先阅读 [Vue 的服务端渲染指南](https://cn.vuejs.org/guide/scaling-up/ssr.html)。

## 访问浏览器 API

`window`、`document`、`navigator` 和 `localStorage` 等浏览器 API 在服务端不存在。不要在 setup 执行期间直接读取它们。

把浏览器专属操作放进 `onMounted()`：

```vue
<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'

const viewportWidth = shallowRef<number>()

onMounted(() => {
  viewportWidth.value = window.innerWidth
})
</script>

<template>
  <span v-if="viewportWidth">视口宽度：{{ viewportWidth }}px</span>
</template>
```

`onMounted()` 不会在服务端执行，因此 `window` 只会在浏览器中被访问。

## 处理导入时访问浏览器的依赖

有些库会在模块加载时立即读取 `window`。即使只在 `onMounted()` 中调用它，文件顶部的静态 `import` 仍会在 SSR 时执行。

把导入本身也放进 `onMounted()`：

```vue
<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(async () => {
  const { mountWidget } = await import('browser-only-widget')
  mountWidget()
})
</script>
```

普通模块也可以使用 `import.meta.env.SSR` 进行条件导入：

```ts
if (!import.meta.env.SSR) {
  const { startTracking } = await import('browser-only-library')
  startTracking()
}
```

条件分支里的导入必须保持动态形式。静态导入总会在模块求值时执行。

## 只在客户端渲染组件

如果组件的渲染过程依赖 DOM，可以等页面挂载后再显示它。配合 `defineAsyncComponent()`，还能推迟加载一个在导入时访问浏览器 API 的组件：

```vue
<script setup lang="ts">
import {
  defineAsyncComponent,
  onMounted,
  shallowRef,
} from 'vue'

const mounted = shallowRef(false)
const ClientWidget = defineAsyncComponent(
  () => import('./ClientWidget.vue'),
)

onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <ClientWidget v-if="mounted" />
</template>
```

服务端和浏览器第一次渲染时，`mounted` 都是 `false`。组件只会在 hydration 完成后加载和显示。

## 在 Runtime Plugin 中使用浏览器插件

Runtime Plugin 的同一份源码会进入 SSR 与 client module graph。对于模块加载时访问浏览器 API 的 Vue 插件，请在非 SSR 分支中动态导入：

```ts
import { defineRuntimePlugin } from 'kawapress'

export default defineRuntimePlugin({
  name: 'browser-only-plugin',
  setup(api) {
    api.vueApp(async (app) => {
      if (!import.meta.env.SSR) {
        const { default: browserPlugin } = await import('browser-plugin')
        app.use(browserPlugin)
      }
    })
  },
})
```

这种方式适合不会改变首次渲染 HTML 的浏览器行为。如果插件会改变组件树，请改用上一节的客户端组件边界，避免服务端与浏览器输出不同。

## 保持首次渲染一致

hydration 要求服务端 HTML 与浏览器第一次渲染得到相同的节点结构和文字。下面这些值不适合直接参与首次渲染：

- `Date.now()` 或其他随请求变化的时间；
- `Math.random()`；
- 浏览器窗口尺寸；
- 只存在于 `localStorage` 的用户设置。

先使用稳定的初始值，再在 `onMounted()` 中读取浏览器状态。需要在两端共同使用的数据，则应该来自相同的 pageData、站点配置或路由信息。

KawaPress 的开发服务器也会真实执行 SSR。兼容性问题通常会在开发时直接出现，不必等到生产构建才发现。
