<script setup lang="ts">
import { computed, nextTick, useTemplateRef } from 'vue'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'
import NagiCatalogIcon from './NagiCatalogIcon.vue'
import OsScroll from './OsScroll.vue'
import Outline from './Outline.vue'

const props = defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()

const theme = useNagiThemeConfig()
const collapseButton = useTemplateRef<HTMLButtonElement>('collapseButton')
const expandButton = useTemplateRef<HTMLButtonElement>('expandButton')
const toggleLabel = computed(() => props.collapsed
  ? theme.value.outlineExpandLabel
  : theme.value.outlineCollapseLabel,
)

async function toggleOutline(): Promise<void> {
  emit('toggle')
  await nextTick()
  const nextButton = props.collapsed ? expandButton : collapseButton
  nextButton.value?.focus()
}
</script>

<template>
  <aside
    v-show="!props.collapsed"
    id="nagi-outline-aside-panel"
    class="nagi-outline-aside"
  >
    <button
      ref="collapseButton"
      class="nagi-outline-aside__toggle nagi-outline-aside__toggle--collapse"
      type="button"
      aria-controls="nagi-outline-aside-panel"
      :aria-expanded="!props.collapsed"
      :aria-label="toggleLabel"
      :title="toggleLabel"
      @click="toggleOutline"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>

    <OsScroll class="nagi-outline-aside__scroll">
      <Outline />
    </OsScroll>
  </aside>

  <button
    v-if="props.collapsed"
    ref="expandButton"
    class="nagi-outline-aside__toggle nagi-outline-aside__toggle--expand"
    type="button"
    aria-controls="nagi-outline-aside-panel"
    :aria-expanded="!props.collapsed"
    :aria-label="toggleLabel"
    :title="toggleLabel"
    @click="toggleOutline"
  >
    <NagiCatalogIcon aria-hidden="true" />
  </button>
</template>
