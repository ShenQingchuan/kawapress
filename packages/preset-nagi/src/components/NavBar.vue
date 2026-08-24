<script setup lang="ts">
import { useSite } from 'kawapress/client'

const site = useSite()
</script>

<template>
  <header class="nagi-nav">
    <a href="/" class="nagi-nav__title">{{ site.title }}</a>
  </header>
</template>

<style scoped>
.nagi-nav {
  padding: 1rem 1.5rem;
  background: var(--nagi-c-bg);
  border-bottom: 1px solid var(--nagi-c-divider);
}

.nagi-nav__title {
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}
</style>
