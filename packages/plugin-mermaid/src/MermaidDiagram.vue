<script setup lang="ts">
import type { Mounted } from 'pele'
import type { MermaidLabels } from './labels'
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'

type View = 'diagram' | 'code' | 'split'

const props = defineProps<{
  source: string
  view: View
  labels: MermaidLabels
  /** Pele's message when the build could not draw the diagram. */
  error?: string
}>()

const VIEWS: readonly View[] = ['diagram', 'code', 'split']

const current = shallowRef<View>(props.view)
const enhanced = shallowRef(false)
const stage = useTemplateRef<HTMLElement>('stage')

let host: HTMLElement | undefined
let mounted: Mounted | undefined
let disposed = false

watch(() => props.view, (view) => {
  current.value = view
})

watch(() => props.source, (source) => {
  mounted?.update(source)
})

onMounted(async () => {
  // The server already drew the diagram. Without a drawn diagram there is
  // nothing to take over, and the error message stays on screen.
  if (props.error !== undefined || !stage.value) {
    return
  }

  const { mountAsync } = await import('pele/lazy')
  if (disposed || !stage.value) {
    return
  }

  // Pele owns this element. It sits next to the server markup instead of
  // replacing it, so Vue never patches nodes that Pele rewrote.
  host = document.createElement('div')
  host.className = 'kawa-mermaid__host'
  stage.value.append(host)

  mounted = await mountAsync(host, props.source, {
    zoom: {
      always: true,
      labels: {
        zoomIn: props.labels.zoomIn,
        zoomOut: props.labels.zoomOut,
        reset: props.labels.reset,
      },
    },
  })
  if (disposed) {
    mounted.destroy()
    return
  }
  enhanced.value = true
})

onBeforeUnmount(() => {
  disposed = true
  mounted?.destroy()
  host?.remove()
})

function labelOf(view: View): string {
  return props.labels[view]
}
</script>

<template>
  <figure class="kawa-mermaid" :data-view="current">
    <div class="kawa-mermaid__bar">
      <div class="kawa-mermaid__views" role="group" :aria-label="labels.views">
        <button
          v-for="option in VIEWS"
          :key="option"
          type="button"
          class="kawa-mermaid__view"
          :aria-pressed="current === option"
          @click="current = option"
        >
          {{ labelOf(option) }}
        </button>
      </div>
    </div>

    <div class="kawa-mermaid__panes">
      <div
        v-show="current !== 'code'"
        ref="stage"
        class="kawa-mermaid__stage"
        :class="{ 'is-enhanced': enhanced }"
      >
        <p v-if="error !== undefined" class="kawa-mermaid__error" role="alert">
          {{ error }}
        </p>
        <slot name="diagram" />
      </div>
      <div v-show="current !== 'diagram'" class="kawa-mermaid__code">
        <slot name="code" />
      </div>
    </div>
  </figure>
</template>
