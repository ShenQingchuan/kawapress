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
const panes = useTemplateRef<HTMLElement>('panes')

/** Share of the width that the diagram takes in the side-by-side view, in percent. */
const SPLIT_MIN = 20
const SPLIT_MAX = 80
const SPLIT_STEP = 5
const split = shallowRef(50)
let dragging = false

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

function clampSplit(value: number): number {
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, value))
}

function moveSplit(clientX: number): void {
  const box = panes.value?.getBoundingClientRect()
  if (!box || box.width === 0) {
    return
  }
  split.value = clampSplit(((clientX - box.left) / box.width) * 100)
}

function onSplitPointerDown(event: PointerEvent): void {
  if (event.button !== 0) {
    return
  }
  dragging = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  event.preventDefault()
}

function onSplitPointerMove(event: PointerEvent): void {
  if (dragging) {
    moveSplit(event.clientX)
  }
}

function onSplitPointerEnd(event: PointerEvent): void {
  dragging = false
  const target = event.currentTarget as HTMLElement
  if (target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }
}

function onSplitKeydown(event: KeyboardEvent): void {
  const step = event.shiftKey ? SPLIT_STEP * 2 : SPLIT_STEP
  if (event.key === 'ArrowLeft') {
    split.value = clampSplit(split.value - step)
  }
  else if (event.key === 'ArrowRight') {
    split.value = clampSplit(split.value + step)
  }
  else if (event.key === 'Home') {
    split.value = SPLIT_MIN
  }
  else if (event.key === 'End') {
    split.value = SPLIT_MAX
  }
  else {
    return
  }
  event.preventDefault()
}

function resetSplit(): void {
  split.value = 50
}
</script>

<template>
  <figure class="kawa-mermaid" :data-view="current">
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

    <div
      ref="panes"
      class="kawa-mermaid__panes"
      :style="{ '--kawa-mermaid-split': `${split}%` }"
    >
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
      <div
        v-show="current === 'split'"
        class="kawa-mermaid__divider"
        role="separator"
        aria-orientation="vertical"
        :aria-label="labels.resize"
        :aria-valuemin="SPLIT_MIN"
        :aria-valuemax="SPLIT_MAX"
        :aria-valuenow="Math.round(split)"
        tabindex="0"
        @dblclick.prevent="resetSplit"
        @keydown="onSplitKeydown"
        @pointerdown="onSplitPointerDown"
        @pointermove="onSplitPointerMove"
        @pointerup="onSplitPointerEnd"
        @pointercancel="onSplitPointerEnd"
      />
      <div v-show="current !== 'diagram'" class="kawa-mermaid__code">
        <slot name="code" />
      </div>
    </div>
  </figure>
</template>
