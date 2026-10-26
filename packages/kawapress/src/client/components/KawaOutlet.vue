<script setup lang="ts">
import type { OutletItem, OutletName } from '../../core/outlet'
import { computed, onUnmounted } from 'vue'
import { assertOutletName, getOutletItems } from '../../core/outlet'
import { recordRenderedOutlet, useOutletRegistry, useOutletRenderStore } from '../outlet'

const props = defineProps<{
  name: OutletName
}>()

defineSlots<{
  /** Full control over the outlet: filter, wrap, or replace the items. */
  default?: (props: { items: readonly OutletItem[] }) => unknown
}>()

assertOutletName(props.name, '<KawaOutlet>')

const registry = useOutletRegistry('<KawaOutlet>')
const items = computed(() => getOutletItems(registry, props.name))

const renderStore = useOutletRenderStore()
renderStore?.mount(props.name)
onUnmounted(() => renderStore?.unmount(props.name))

recordRenderedOutlet(props.name)
</script>

<template>
  <slot :items="items">
    <component
      :is="item.component"
      v-for="item in items"
      :key="item.id"
    />
  </slot>
</template>
