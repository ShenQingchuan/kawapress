<script setup lang="ts">
import { useRouter } from 'kawapress/client'
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'
import { useSidebarItems } from '../composables/useSidebarItems'
import {
  applySidebarWidth,
  applyStoredSidebarWidth,
  NAGI_SIDEBAR_DEFAULT_WIDTH,
  NAGI_SIDEBAR_MAX_WIDTH,
  NAGI_SIDEBAR_MIN_WIDTH,
  persistSidebarWidth,
  resetSidebarWidth,
} from '../sidebar-width'
import OsScroll from './OsScroll.vue'
import SidebarItem from './SidebarItem.vue'

const props = withDefaults(defineProps<{
  mode?: 'desktop' | 'drawer'
}>(), {
  mode: 'desktop',
})

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const theme = useNagiThemeConfig()
const items = useSidebarItems()
const sidebar = useTemplateRef<HTMLElement>('sidebar')
const width = shallowRef(NAGI_SIDEBAR_DEFAULT_WIDTH)
let activePointerId: number | undefined
let dragStartWidth = NAGI_SIDEBAR_DEFAULT_WIDTH
let dragStartX = 0

onMounted(() => {
  if (props.mode === 'drawer') {
    sidebar.value?.focus()
    return
  }
  width.value = applyStoredSidebarWidth()
})

onBeforeUnmount(finishResize)

function handleResizePointerDown(event: PointerEvent): void {
  if (event.button !== 0) {
    return
  }

  activePointerId = event.pointerId
  dragStartWidth = width.value
  dragStartX = event.clientX
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture(event.pointerId)
  document.documentElement.setAttribute('data-nagi-sidebar-resizing', '')
  event.preventDefault()
}

function handleResizePointerMove(event: PointerEvent): void {
  if (event.pointerId !== activePointerId) {
    return
  }

  const delta = (event.clientX - dragStartX) / rootFontSize()
  width.value = applySidebarWidth(dragStartWidth + delta)
}

function handleResizePointerEnd(event: PointerEvent): void {
  if (event.pointerId !== activePointerId) {
    return
  }

  width.value = persistSidebarWidth(width.value)
  const target = event.currentTarget as HTMLElement
  if (target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }
  finishResize()
}

function handleResizeKeydown(event: KeyboardEvent): void {
  const step = event.shiftKey ? 1 : 0.5
  let nextWidth: number | undefined

  if (event.key === 'ArrowLeft') {
    nextWidth = width.value - step
  }
  else if (event.key === 'ArrowRight') {
    nextWidth = width.value + step
  }
  else if (event.key === 'Home') {
    nextWidth = NAGI_SIDEBAR_MIN_WIDTH
  }
  else if (event.key === 'End') {
    nextWidth = NAGI_SIDEBAR_MAX_WIDTH
  }

  if (nextWidth === undefined) {
    return
  }
  event.preventDefault()
  width.value = persistSidebarWidth(nextWidth)
}

function handleResizeReset(): void {
  width.value = resetSidebarWidth()
}

function finishResize(): void {
  activePointerId = undefined
  document.documentElement.removeAttribute('data-nagi-sidebar-resizing')
}

function rootFontSize(): number {
  const size = Number.parseFloat(
    window.getComputedStyle(document.documentElement).fontSize,
  )
  return Number.isFinite(size) && size > 0 ? size : 16
}

watch(() => router.currentRoute.value.path, () => {
  if (props.mode === 'drawer') {
    emit('close')
  }
})
</script>

<template>
  <aside
    :id="props.mode === 'drawer' ? 'nagi-sidebar-drawer' : undefined"
    ref="sidebar"
    class="nagi-sidebar"
    :class="`nagi-sidebar--${props.mode}`"
    :aria-label="theme.sidebarMenuLabel"
    :tabindex="props.mode === 'drawer' ? -1 : undefined"
    @keydown.esc="emit('close')"
  >
    <OsScroll class="nagi-sidebar__scroll">
      <nav class="nagi-sidebar__nav">
        <ul class="nagi-sidebar__items">
          <SidebarItem
            v-for="item in items"
            :key="item.link ?? item.text"
            :item="item"
            @navigate="emit('close')"
          />
        </ul>
      </nav>
    </OsScroll>

    <div
      v-if="props.mode === 'desktop'"
      class="nagi-sidebar__resizer"
      role="separator"
      :aria-label="theme.sidebarResizeLabel"
      aria-orientation="vertical"
      :aria-valuemin="NAGI_SIDEBAR_MIN_WIDTH"
      :aria-valuemax="NAGI_SIDEBAR_MAX_WIDTH"
      :aria-valuenow="width"
      tabindex="0"
      @dblclick.prevent="handleResizeReset"
      @keydown="handleResizeKeydown"
      @lostpointercapture="finishResize"
      @pointercancel="handleResizePointerEnd"
      @pointerdown="handleResizePointerDown"
      @pointermove="handleResizePointerMove"
      @pointerup="handleResizePointerEnd"
    />
  </aside>
</template>
