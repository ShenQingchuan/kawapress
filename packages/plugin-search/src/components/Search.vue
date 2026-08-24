<script setup lang="ts">
import type { SearchTranslations } from '../translations'
import { useSite } from 'kawapress/client'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import { resolveSearchTranslations } from '../translations'
import SearchOverlay from './SearchOverlay.vue'

interface Props {
  translations?: Partial<SearchTranslations>
}

const props = withDefaults(defineProps<Props>(), {
  translations: () => ({}),
})
const site = useSite()
const resolvedTranslations = computed(() => resolveSearchTranslations(
  props.translations,
  site.value.lang,
))
const open = shallowRef(false)
const shortcutModifier = shallowRef('Ctrl')
const trigger = useTemplateRef<HTMLButtonElement>('trigger')

onMounted(() => {
  if (/Mac|iPhone|iPad|iPod/i.test(navigator.platform)) {
    shortcutModifier.value = '⌘'
  }
  window.addEventListener('keydown', handleGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})

function handleGlobalKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.isComposing) {
    return
  }

  const commandK = event.key.toLocaleLowerCase() === 'k'
    && (event.metaKey || event.ctrlKey)
    && !event.altKey
  const slash = event.key === '/'
    && !event.metaKey
    && !event.ctrlKey
    && !event.altKey
    && !event.shiftKey
    && !isTextInput(event.target)

  if (commandK || slash) {
    event.preventDefault()
    open.value = true
  }
}

function isTextInput(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
  ))
}

async function close(): Promise<void> {
  open.value = false
  await nextTick()
  trigger.value?.focus()
}
</script>

<template>
  <button
    ref="trigger"
    type="button"
    class="kawa-search-button"
    :aria-label="resolvedTranslations.buttonLabel"
    aria-keyshortcuts="Control+K Meta+K /"
    @click="open = true"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
    <span class="kawa-search-button__text">{{ resolvedTranslations.buttonLabel }}</span>
    <span class="kawa-search-button__keys" aria-hidden="true">
      <kbd>{{ shortcutModifier }}</kbd><kbd>K</kbd>
    </span>
  </button>

  <SearchOverlay
    v-if="open"
    :translations="resolvedTranslations"
    @close="close"
  />
</template>
