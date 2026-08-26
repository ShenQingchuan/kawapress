<script setup lang="ts">
import { useSite } from 'kawapress/client'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'

const site = useSite()
const theme = useNagiThemeConfig()
</script>

<template>
  <div class="nagi-notfound">
    <h1>404</h1>
    <p>{{ theme.notFoundMessage }}</p>
    <a :href="site.link">{{ theme.notFoundHomeLabel }}</a>
  </div>
</template>
