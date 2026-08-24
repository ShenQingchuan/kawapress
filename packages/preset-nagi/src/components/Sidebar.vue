<script setup lang="ts">
import type { PageData } from 'kawapress'
import { useLocale, useRouter } from 'kawapress/client'
import { computed, onMounted, useTemplateRef, watch } from 'vue'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'
import { createSidebar } from '../sidebar'
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
const { localeIndex, locales } = useLocale()
const pages: Record<string, PageData> = {}
for (const route of router.getRoutes()) {
  const pageData = route.meta.pageData as PageData | undefined
  if (pageData) {
    pages[pageData.path] = pageData
  }
}
const items = computed(() => {
  const currentLocale = localeIndex.value
  const localePrefixes = locales.value
    .map(locale => locale.localeIndex)
    .filter(locale => locale !== 'root')
    .map(locale => `/${locale}`)
  const currentPrefix = currentLocale === 'root' ? '' : `/${currentLocale}`
  const localePages = Object.fromEntries(
    Object.entries(pages).filter(([path]) => {
      if (currentLocale === 'root') {
        return !localePrefixes.some(
          prefix => path === prefix || path.startsWith(`${prefix}/`),
        )
      }
      return path === currentPrefix || path.startsWith(`${currentPrefix}/`)
    }),
  )
  return createSidebar(localePages, { base: currentPrefix })
})
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
