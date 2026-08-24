---
title: Markdown Page
---

<script setup lang="ts">
import Counter from './Counter.vue'
</script>

# Hello from Markdown

This page is a **markdown** file, compiled to a Vue component.

<Counter />

## Twoslash

```vue twoslash
<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
//    ^?
</script>

<template>
  <button>{{ count }}</button>
</template>
```

```ts twoslash
// @errors: 2322
const answer: number = 'forty-two'
```

[Go to guide](/guide/getting-started)
