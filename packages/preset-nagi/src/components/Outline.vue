<script setup lang="ts">
import { usePageData } from 'kawapress/client'
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import { useActiveOutline } from '../composables/useActiveOutline'
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
const list = useTemplateRef<HTMLElement>('list')
const marker = useTemplateRef<HTMLElement>('marker')
const { activeOutlineLink, activateLink } = useActiveOutline()

watch([activeOutlineLink, items], async () => {
  await nextTick()
  const listEl = list.value
  const markerEl = marker.value
  if (!listEl || !markerEl) {
    return
  }

  const active = listEl.querySelector<HTMLElement>('.nagi-outline-item__link.is-active')
  if (!active) {
    markerEl.style.opacity = '0'
    return
  }

  markerEl.style.top = `${active.offsetTop + (active.offsetHeight - markerEl.offsetHeight) / 2}px`
  markerEl.style.opacity = '1'
}, { flush: 'post', immediate: true })

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
    <div ref="list" class="nagi-outline__tree">
      <span
        ref="marker"
        class="nagi-outline__marker"
        aria-hidden="true"
      />
      <ul class="nagi-outline__items">
        <OutlineItem
          v-for="item in items"
          :key="item.link"
          :item="item"
          :active-link="activeOutlineLink"
          @navigate="onNavigate"
        />
      </ul>
    </div>
  </nav>
</template>
