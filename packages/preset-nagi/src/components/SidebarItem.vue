<script setup lang="ts">
import type { SidebarItem } from '../sidebar'
import { RouterLink } from 'kawapress/client'

defineProps<{
  item: SidebarItem
}>()

const emit = defineEmits<{
  navigate: []
}>()
</script>

<template>
  <li
    class="nagi-sidebar-item"
    :class="{ 'nagi-sidebar-item--group': item.items?.length }"
  >
    <RouterLink
      v-if="item.link"
      :to="item.link"
      class="nagi-sidebar-item__link"
      exact-active-class="is-active"
      @click="emit('navigate')"
    >
      {{ item.text }}
    </RouterLink>
    <p v-else class="nagi-sidebar-item__text">
      {{ item.text }}
    </p>

    <ul v-if="item.items?.length" class="nagi-sidebar-item__items">
      <SidebarItem
        v-for="(child, index) in item.items"
        :key="child.link ?? `${child.text}-${index}`"
        :item="child"
        @navigate="emit('navigate')"
      />
    </ul>
  </li>
</template>
