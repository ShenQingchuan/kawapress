<script setup lang="ts">
import type { NagiHomeFeature } from '../home'
import { RouterLink } from 'kawapress/client'
import { computed } from 'vue'
import { isExternalLink } from '../home'

const props = defineProps<{
  feature: NagiHomeFeature
}>()

const component = computed(() => {
  if (!props.feature.link) {
    return 'div'
  }
  return isExternalLink(props.feature.link) ? 'a' : RouterLink
})
const componentProps = computed(() => {
  const { link, rel, target } = props.feature
  if (!link) {
    return {}
  }
  if (isExternalLink(link)) {
    return {
      href: link,
      rel: rel ?? 'noreferrer',
      target: target ?? '_blank',
    }
  }
  return { to: link }
})
</script>

<template>
  <component
    :is="component"
    class="nagi-home-feature"
    :class="{ 'nagi-home-feature--link': feature.link }"
    v-bind="componentProps"
  >
    <article class="nagi-home-feature__box">
      <div v-if="feature.icon" class="nagi-home-feature__icon" aria-hidden="true">
        {{ feature.icon }}
      </div>
      <h2 class="nagi-home-feature__title">
        {{ feature.title }}
      </h2>
      <p class="nagi-home-feature__details">
        {{ feature.details }}
      </p>
      <p v-if="feature.linkText" class="nagi-home-feature__link-text">
        {{ feature.linkText }} <span aria-hidden="true">→</span>
      </p>
    </article>
  </component>
</template>
