<script setup lang="ts">
import { useSite } from 'kawapress/client'
import LanguageMenu from './LanguageMenu.vue'

const site = useSite()
</script>

<template>
  <header class="nagi-nav">
    <a :href="site.link" class="nagi-nav__title">{{ site.title }}</a>
    <LanguageMenu />
  </header>
</template>
