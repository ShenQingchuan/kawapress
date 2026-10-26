<script setup lang="ts">
import type {
  OverlayScrollbars as OverlayScrollbarsInstance,
  PartialOptions,
} from 'overlayscrollbars'
import type { OverlayScrollbarsRuntime } from '../os-scroll'
import { computed, onMounted, onUnmounted, useTemplateRef, watch } from 'vue'
import { loadOverlayScrollbars, resolveNagiScrollOptions } from '../os-scroll'

interface Props {
  options?: PartialOptions
}

const props = withDefaults(defineProps<Props>(), {
  options: () => ({}),
})

/**
 * The host keeps the layout styles of the parent (`.nagi-*__scroll`) and gives
 * the runtime a stable element to attach its scrollbars to. The viewport is the
 * scrolling element from the first paint on: the runtime only decorates it
 * later, so its DOM node, its scroll position and every scroll listener stay
 * valid for the whole life of the page.
 */
const host = useTemplateRef<HTMLElement>('host')
const viewport = useTemplateRef<HTMLElement>('viewport')

const resolvedOptions = computed(() => resolveNagiScrollOptions(props.options))

let instance: OverlayScrollbarsInstance | null = null
let unmounted = false

onMounted(() => {
  void enhance()
})

onUnmounted(() => {
  unmounted = true
  instance?.destroy()
  instance = null
})

watch(resolvedOptions, (options) => {
  instance?.options(options, true)
})

async function enhance(): Promise<void> {
  const hostElement = host.value
  const viewportElement = viewport.value
  if (!hostElement || !viewportElement) {
    return
  }
  let runtime: OverlayScrollbarsRuntime
  try {
    runtime = await loadOverlayScrollbars()
  }
  catch (error) {
    // The scroll area already scrolls with its themed native scrollbar, so a
    // missing chunk only costs the enhancement, never the page.
    console.warn(
      '[nagi] OverlayScrollbars could not be loaded, the scroll areas keep '
      + 'their native scrollbar. Check that the site ships every built asset.',
      error,
    )
    return
  }
  // The component can be gone already while the lazy chunk was in flight.
  if (unmounted) {
    return
  }
  instance = runtime.OverlayScrollbars({
    target: hostElement,
    elements: {
      // Reusing the rendered viewport as the content element keeps the slotted
      // nodes where Vue put them: the runtime never re-parents them.
      viewport: viewportElement,
      content: viewportElement,
    },
  }, resolvedOptions.value)
}

function getScrollElement(): HTMLElement | null {
  return viewport.value
}

function osInstance(): OverlayScrollbarsInstance | null {
  return instance
}

defineExpose({ getScrollElement, osInstance })
</script>

<template>
  <div ref="host" class="nagi-os-scroll">
    <div ref="viewport" class="nagi-os-scroll__viewport">
      <slot />
    </div>
  </div>
</template>
