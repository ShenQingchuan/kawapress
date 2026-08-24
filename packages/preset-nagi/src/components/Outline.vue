<script setup lang="ts">
import { usePageData } from 'kawapress/client'
import { computed } from 'vue'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'
import { getOutlineHeaders } from '../outline'
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
    <ul class="nagi-outline__items">
      <OutlineItem
        v-for="item in items"
        :key="item.link"
        :item="item"
        @navigate="emit('navigate')"
      />
    </ul>
  </nav>
</template>
