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
  border-bottom: 1px solid #e5e5e5;
}

.nagi-nav__title {
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}
</style>
