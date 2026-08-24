<script setup lang="ts">
import type { NagiHomeFrontmatter } from '../home'
import { RouterView, usePageData } from 'kawapress/client'
import { computed } from 'vue'
import HomeFeatures from './HomeFeatures.vue'
import HomeHero from './HomeHero.vue'

const page = usePageData()
const frontmatter = computed(() =>
  (page.value?.frontmatter ?? {}) as NagiHomeFrontmatter,
)
</script>

<template>
  <div class="nagi-home">
    <HomeHero v-if="frontmatter.hero" :hero="frontmatter.hero" />
    <HomeFeatures
      v-if="frontmatter.features?.length"
      :features="frontmatter.features"
    />
    <div class="nagi-home__content nagi-doc">
      <RouterView />
    </div>
  </div>
</template>
