<script setup lang="ts">
const enabled = import.meta.env.SSG_MD
</script>

<template>
  <div v-if="enabled" data-kawa-ssg-md-root>
    <slot />
  </div>
</template>
