<script setup lang="ts">
import type { OutletName } from '../../core/outlet'
import { computed, onUnmounted } from 'vue'
import { assertOutletName, getOutletSlots } from '../../core/outlet'
import { recordRenderedOutlet, useOutletRegistry, useOutletRenderStore } from '../outlet'

const props = defineProps<{
  name: OutletName
}>()

defineSlots<{
  /** The theme's own content. Plugin items render before and after it. */
  default?: () => unknown
}>()

assertOutletName(props.name, '<KawaOutlet>')

const registry = useOutletRegistry('<KawaOutlet>')
// `slots` stays unset when the name check above throws; Vue still renders once after that.
const slots = computed(() => getOutletSlots(registry, props.name))

const renderStore = useOutletRenderStore()
renderStore?.mount(props.name)
onUnmounted(() => renderStore?.unmount(props.name))

recordRenderedOutlet(props.name)
</script>

<template>
  <component
    :is="item.component"
    v-for="item in slots?.prepend"
    :key="item.id"
  />
  <slot />
  <component
    :is="item.component"
    v-for="item in slots?.append"
    :key="item.id"
  />
</template>
