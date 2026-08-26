<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { useSite } from '../composables'

const site = useSite()
useHead(() => ({
  htmlAttrs: {
    lang: site.value.lang,
    dir: site.value.dir,
  },
}))
</script>

<template>
  <Layout />
</template>
