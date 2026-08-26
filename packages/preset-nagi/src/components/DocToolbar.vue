<script setup lang="ts">
import { usePageData } from 'kawapress/client'
import { computed } from 'vue'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'
import { getOutlineHeaders } from '../outline'
import OsScroll from './OsScroll.vue'
import Outline from './Outline.vue'

const props = defineProps<{
  outlineEnabled: boolean
  outlineOpen: boolean
  sidebarEnabled: boolean
}>()

const emit = defineEmits<{
  closeOutline: []
  returnToTop: []
  toggleOutline: []
  toggleSidebar: []
}>()

const page = usePageData()
const theme = useNagiThemeConfig()
const hasOutline = computed(() => (
  props.outlineEnabled
  && getOutlineHeaders(page.value?.headers ?? []).length > 0
))

function returnToTop(): void {
  emit('returnToTop')
  emit('closeOutline')
}
</script>

<template>
  <div
    class="nagi-doc-toolbar"
    :class="{ 'nagi-doc-toolbar--has-outline': hasOutline }"
  >
    <button
      v-if="props.sidebarEnabled"
      class="nagi-doc-toolbar__menu"
      type="button"
      aria-controls="nagi-sidebar-drawer"
      @click="emit('toggleSidebar')"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
      <span>{{ theme.sidebarMenuLabel }}</span>
    </button>

    <button
      v-if="hasOutline"
      class="nagi-doc-toolbar__outline"
      type="button"
      aria-controls="nagi-outline-dropdown"
      :aria-expanded="props.outlineOpen"
      @click="emit('toggleOutline')"
    >
      <span>{{ theme.outlineLabel }}</span>
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m8 10 4 4 4-4" />
      </svg>
    </button>

    <Transition name="nagi-outline-dropdown">
      <div
        v-if="hasOutline && props.outlineOpen"
        id="nagi-outline-dropdown"
        class="nagi-doc-toolbar__dropdown"
      >
        <OsScroll class="nagi-doc-toolbar__dropdown-scroll">
          <button
            type="button"
            class="nagi-doc-toolbar__top"
            @click="returnToTop"
          >
            {{ theme.returnToTopLabel }}
          </button>
          <Outline :show-title="false" @navigate="emit('closeOutline')" />
        </OsScroll>
      </div>
    </Transition>
  </div>
</template>
