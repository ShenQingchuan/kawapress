<script setup lang="ts">
import { useRoute, useSite, withBase } from 'kawapress/client'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'
import { isNavItemActive } from '../nav'

withDefaults(defineProps<{
  variant?: 'bar' | 'list'
}>(), {
  variant: 'bar',
})

const emit = defineEmits<{
  navigate: []
}>()

const site = useSite()
const route = useRoute()
const theme = useNagiThemeConfig()
</script>

<template>
  <nav
    v-if="theme.nav?.length"
    class="nagi-nav-links"
    :class="`nagi-nav-links--${variant}`"
    :aria-label="theme.navLinksLabel"
  >
    <!-- Plain anchors: the global link interceptor turns same-origin clicks into router navigations. -->
    <a
      v-for="item in theme.nav"
      :key="item.link"
      :href="withBase(item.link, site.base)"
      class="nagi-nav-links__link"
      :class="{ 'is-active': isNavItemActive(item, route.path) }"
      :aria-current="isNavItemActive(item, route.path) ? 'page' : undefined"
      @click="emit('navigate')"
    >
      {{ item.text }}
    </a>
  </nav>
</template>
