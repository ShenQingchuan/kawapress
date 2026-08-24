<script setup lang="ts">
import { useRouter } from 'kawapress/client'
import { onMounted, useTemplateRef, watch } from 'vue'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'
import { useSidebarItems } from '../composables/useSidebarItems'
import OsScroll from './OsScroll.vue'
import SidebarItem from './SidebarItem.vue'

const props = withDefaults(defineProps<{
  mode?: 'desktop' | 'drawer'
}>(), {
  mode: 'desktop',
})

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const theme = useNagiThemeConfig()
const items = useSidebarItems()
const sidebar = useTemplateRef<HTMLElement>('sidebar')

onMounted(() => {
  if (props.mode === 'drawer') {
    sidebar.value?.focus()
  }
})

watch(() => router.currentRoute.value.path, () => {
  if (props.mode === 'drawer') {
    emit('close')
  }
})
</script>

<template>
  <aside
    :id="props.mode === 'drawer' ? 'nagi-sidebar-drawer' : undefined"
    ref="sidebar"
    class="nagi-sidebar"
    :class="`nagi-sidebar--${props.mode}`"
    :aria-label="theme.sidebarMenuLabel"
    :tabindex="props.mode === 'drawer' ? -1 : undefined"
    @keydown.esc="emit('close')"
  >
    <OsScroll class="nagi-sidebar__scroll">
      <nav class="nagi-sidebar__nav">
        <ul class="nagi-sidebar__items">
          <SidebarItem
            v-for="item in items"
            :key="item.link ?? item.text"
            :item="item"
            @navigate="emit('close')"
          />
        </ul>
      </nav>
    </OsScroll>
  </aside>
</template>
