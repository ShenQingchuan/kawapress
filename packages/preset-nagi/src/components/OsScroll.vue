<script setup lang="ts">
import type {
  OverlayScrollbars as OverlayScrollbarsInstance,
  PartialOptions,
} from 'overlayscrollbars'
import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-vue'
import { ClickScrollPlugin, OverlayScrollbars } from 'overlayscrollbars'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import { computed, ref } from 'vue'

interface Props {
  options?: PartialOptions
  defer?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  defer: true,
  options: () => ({}),
})

OverlayScrollbars.plugin(ClickScrollPlugin)

const resolvedOptions = computed<PartialOptions>(() => ({
  ...props.options,
  scrollbars: {
    ...props.options.scrollbars,
    theme: 'os-theme-nagi',
    autoHide: 'leave',
    autoHideDelay: 0,
    clickScroll: true,
  },
}))

const innerRef = ref<OverlayScrollbarsComponentRef | null>(null)

function osInstance(): OverlayScrollbarsInstance | null {
  return innerRef.value?.osInstance() ?? null
}

function getElement(): HTMLElement | null {
  return innerRef.value?.getElement() ?? null
}

function getScrollElement(): HTMLElement | null {
  return osInstance()?.elements().viewport ?? null
}

defineExpose({ getElement, getScrollElement, osInstance })
</script>

<template>
  <OverlayScrollbarsComponent
    ref="innerRef"
    class="nagi-os-scroll"
    :options="resolvedOptions"
    :defer="props.defer"
  >
    <slot />
  </OverlayScrollbarsComponent>
</template>
