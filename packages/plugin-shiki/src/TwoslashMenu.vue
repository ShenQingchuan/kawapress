<script setup lang="ts">
import { Menu } from 'floating-vue'
import { useId } from 'vue'

defineOptions({
  name: 'KawaTwoslashMenu',
})

const ariaId = useId()
</script>

<template>
  <Menu :aria-id="ariaId">
    <slot />
    <template #popper="slotProps">
      <slot name="popper" v-bind="slotProps" />
    </template>
  </Menu>
</template>
