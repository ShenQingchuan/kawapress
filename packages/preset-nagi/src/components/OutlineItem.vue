<script setup lang="ts">
import type { PageHeader } from 'kawapress'

defineProps<{
  item: PageHeader
  activeLink: string | null
}>()

const emit = defineEmits<{
  navigate: [link: string]
}>()
</script>

<template>
  <li class="nagi-outline-item">
    <a
      :href="item.link"
      class="nagi-outline-item__link"
      :class="{ 'is-active': item.link === activeLink }"
      :aria-current="item.link === activeLink ? 'location' : undefined"
      @click="emit('navigate', item.link)"
    >
      {{ item.title }}
    </a>
    <ul v-if="item.children.length" class="nagi-outline-item__items">
      <OutlineItem
        v-for="child in item.children"
        :key="child.link"
        :item="child"
        :active-link="activeLink"
        @navigate="emit('navigate', $event)"
      />
    </ul>
  </li>
</template>
