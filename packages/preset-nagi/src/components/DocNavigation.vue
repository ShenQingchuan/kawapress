<script setup lang="ts">
import { RouterLink, useRouter } from 'kawapress/client'
import { computed } from 'vue'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'
import { useSidebarItems } from '../composables/useSidebarItems'
import { findSidebarNavigation } from '../sidebar'

const router = useRouter()
const theme = useNagiThemeConfig()
const items = useSidebarItems()
const navigation = computed(() => findSidebarNavigation(
  items.value,
  router.currentRoute.value.path,
))
</script>

<template>
  <nav
    v-if="navigation.previous || navigation.next"
    class="nagi-doc-navigation"
  >
    <RouterLink
      v-if="navigation.previous"
      :to="navigation.previous.link"
      class="nagi-doc-navigation__link nagi-doc-navigation__link--previous"
    >
      <span class="nagi-doc-navigation__label">
        {{ theme.previousPageLabel }}
      </span>
      <span class="nagi-doc-navigation__title">
        {{ navigation.previous.text }}
      </span>
    </RouterLink>

    <RouterLink
      v-if="navigation.next"
      :to="navigation.next.link"
      class="nagi-doc-navigation__link nagi-doc-navigation__link--next"
    >
      <span class="nagi-doc-navigation__label">
        {{ theme.nextPageLabel }}
      </span>
      <span class="nagi-doc-navigation__title">
        {{ navigation.next.text }}
      </span>
    </RouterLink>
  </nav>
</template>
