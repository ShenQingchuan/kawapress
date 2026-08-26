---
description: Write Vue code that runs safely during KawaPress server rendering and in the browser.
---

# SSR Compatibility

KawaPress performs server-side rendering (SSR) for initial requests during development and again during production builds. Custom code in pages, components, and Runtime Plugins must work in both Node.js and browser environments.

Read the [Vue Server-Side Rendering guide](https://vuejs.org/guide/scaling-up/ssr.html) for a broader introduction to SSR.

## Access Browser APIs

Browser APIs such as `window`, `document`, `navigator`, and `localStorage` do not exist on the server. Do not access them directly while setup runs.

Move browser-only work into `onMounted()`:

```vue
<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'

const viewportWidth = shallowRef<number>()

onMounted(() => {
  viewportWidth.value = window.innerWidth
})
</script>

<template>
  <span v-if="viewportWidth">Viewport width: {{ viewportWidth }}px</span>
</template>
```

`onMounted()` does not run during SSR, so `window` is only accessed in the browser.

## Handle Dependencies That Access Browser APIs on Import

Some libraries access `window` as soon as their module loads. Calling the library only from `onMounted()` is not enough if a static import at the top of the file still runs during SSR.

Move the import itself into `onMounted()`:

```vue
<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(async () => {
  const { mountWidget } = await import('browser-only-widget')
  mountWidget()
})
</script>
```

Regular modules can also branch on `import.meta.env.SSR`:

```ts
if (!import.meta.env.SSR) {
  const { startTracking } = await import('browser-only-library')
  startTracking()
}
```

Keep the import dynamic inside the branch. Static imports always run when the module is evaluated.

## Render a Component Only on the Client

If a component requires the DOM while rendering, wait until the page mounts before displaying it. Combine this boundary with `defineAsyncComponent()` when the component also accesses browser APIs during import:

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

`mounted` is `false` for both the server render and the browser's first render. The component loads and appears only after hydration.

## Use a Browser Plugin from a Runtime Plugin

The same Runtime Plugin source enters both the SSR and client module graphs. Dynamically import a Vue plugin in the non-SSR branch when it accesses browser APIs during module evaluation:

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

Use this pattern only for browser behavior that does not change the initial HTML. If a plugin changes the component tree, use the client-only component boundary from the previous section to keep server and browser output aligned.

## Keep the First Render Stable

Hydration requires the server HTML and the browser's first render to produce the same node structure and text. Avoid using these values directly during the first render:

- `Date.now()` or other request-dependent timestamps;
- `Math.random()`;
- browser viewport dimensions;
- user settings that exist only in `localStorage`.

Start with a stable value, then read browser state from `onMounted()`. Data needed by both environments should come from the same pageData, site configuration, or route information.

KawaPress also performs real SSR in development. Compatibility errors usually appear while developing instead of waiting until a production build.
