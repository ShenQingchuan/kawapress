<script setup lang="ts">
import type { PageHeader } from 'kawapress'

defineProps<{
  item: PageHeader
}>()

const emit = defineEmits<{
  navigate: []
}>()
</script>

<template>
  <li class="nagi-outline-item">
    <a
      :href="item.link"
      class="nagi-outline-item__link"
      @click="emit('navigate')"
    >
      {{ item.title }}
    </a>
    <ul v-if="item.children.length" class="nagi-outline-item__items">
      <OutlineItem
        v-for="child in item.children"
        :key="child.link"
        :item="child"
        @navigate="emit('navigate')"
      />
    </ul>
  </li>
</template>
