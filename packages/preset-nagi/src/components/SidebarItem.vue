<script setup lang="ts">
import type { SidebarItem } from '../sidebar'
import { useSite, withBase } from 'kawapress/client'
import { computed } from 'vue'
import { isSidebarLinkActive } from '../sidebar'

const props = defineProps<{
  item: SidebarItem
  /** Current route path; the sidebar computes it once for every link. */
  activePath: string
}>()

const emit = defineEmits<{
  navigate: []
}>()

const site = useSite()
const href = computed(() => (
  props.item.link === undefined
    ? undefined
    : withBase(props.item.link, site.value.base)
))
const isActive = computed(() => (
  props.item.link !== undefined
  && isSidebarLinkActive(props.item.link, props.activePath)
))
</script>

<template>
  <li
    class="nagi-sidebar-item"
    :class="{ 'nagi-sidebar-item--group': item.items?.length }"
  >
    <!-- A plain anchor: the core link interceptor turns same-origin clicks into
    router navigations, and resolving every link against the route table here
    would cost O(pages) per page. -->
    <a
      v-if="item.link"
      :href="href"
      class="nagi-sidebar-item__link"
      :class="{ 'is-active': isActive }"
      :aria-current="isActive ? 'page' : undefined"
      @click="emit('navigate')"
    >
      {{ item.text }}
    </a>
    <p v-else class="nagi-sidebar-item__text">
      {{ item.text }}
    </p>

    <ul v-if="item.items?.length" class="nagi-sidebar-item__items">
      <SidebarItem
        v-for="(child, index) in item.items"
        :key="child.link ?? `${child.text}-${index}`"
        :item="child"
        :active-path="activePath"
        @navigate="emit('navigate')"
      />
    </ul>
  </li>
</template>
