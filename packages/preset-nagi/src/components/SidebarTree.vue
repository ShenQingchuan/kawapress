<script setup lang="ts">
import type { SidebarItem as SidebarItemData } from '../sidebar'
import SidebarItem from './SidebarItem.vue'

defineProps<{
  items: readonly SidebarItemData[]
  activePath: string
}>()

const emit = defineEmits<{
  navigate: []
}>()
</script>

<template>
  <ul class="nagi-sidebar__items">
    <SidebarItem
      v-for="item in items"
      :key="item.link ?? item.text"
      :item="item"
      :active-path="activePath"
      @navigate="emit('navigate')"
    />
  </ul>
</template>
