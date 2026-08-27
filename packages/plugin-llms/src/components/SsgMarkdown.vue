<script setup lang="ts">
defineProps<{
  content: string
}>()

const enabled = import.meta.env.SSG_MD
</script>

<template>
  <div v-if="enabled" data-kawa-ssg-md-raw>
    {{ content }}
  </div>
</template>
