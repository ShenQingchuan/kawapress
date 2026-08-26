<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { usePageData } from 'kawapress/client'
import { computed } from 'vue'
import { useActiveOutline } from '../composables/useActiveOutline'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'
import { getOutlineHeaders, resolveDisplayedOutlineLink } from '../outline'
import outlineInitializerScript from '../outline-initializer.js?raw'
import OutlineItem from './OutlineItem.vue'

withDefaults(defineProps<{
  showTitle?: boolean
}>(), {
  showTitle: true,
})

const emit = defineEmits<{
  navigate: []
}>()

const page = usePageData()
const theme = useNagiThemeConfig()
const items = computed(() => getOutlineHeaders(page.value?.headers ?? []))
const { activeOutlineLink, activateLink } = useActiveOutline()
const initialActiveLink = import.meta.env.SSR
  ? null
  : (window as Window & {
      __KAWA_NAGI_INITIAL_OUTLINE_LINK__?: string
    }).__KAWA_NAGI_INITIAL_OUTLINE_LINK__ ?? null
const initialPagePath = page.value?.path
const displayedActiveLink = computed(() => {
  const currentActiveLink = activeOutlineLink.value ?? (
    page.value?.path === initialPagePath ? initialActiveLink : null
  )
  return resolveDisplayedOutlineLink(items.value, currentActiveLink)
})

useHead({
  script: [{
    id: 'nagi-outline-initial-hash',
    textContent: outlineInitializerScript,
  }],
})

function onNavigate(link: string): void {
  activateLink(link, true)
  emit('navigate')
}
</script>

<template>
  <nav
    v-if="items.length"
    class="nagi-outline"
    :aria-label="theme.outlineLabel"
  >
    <p v-if="showTitle" class="nagi-outline__title">
      {{ theme.outlineLabel }}
    </p>
    <div class="nagi-outline__tree">
      <ul class="nagi-outline__items">
        <OutlineItem
          v-for="item in items"
          :key="item.link"
          :item="item"
          :active-link="displayedActiveLink"
          @navigate="onNavigate"
        />
      </ul>
    </div>
  </nav>
</template>
