<script setup lang="ts">
import type { NagiHomeFeature } from '../home'
import HomeFeature from './HomeFeature.vue'

defineProps<{
  features: NagiHomeFeature[]
}>()
</script>

<template>
  <section class="nagi-home-features">
    <ul class="nagi-home-features__items">
      <li
        v-for="feature in features"
        :key="feature.title"
        class="nagi-home-features__item"
      >
        <HomeFeature :feature="feature" />
      </li>
    </ul>
  </section>
</template>
