<script setup lang="ts">
import { shallowRef, useId } from 'vue'

const props = defineProps<{
  labels: string[]
}>()

const activeIndex = shallowRef(0)
const groupId = useId()

function select(index: number): void {
  activeIndex.value = index
}

function handleKeydown(event: KeyboardEvent, index: number): void {
  let next = index
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    next = (index - 1 + props.labels.length) % props.labels.length
  }
  else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    next = (index + 1) % props.labels.length
  }
  else if (event.key === 'Home') {
    next = 0
  }
  else if (event.key === 'End') {
    next = props.labels.length - 1
  }
  else {
    return
  }

  event.preventDefault()
  select(next)
  const target = event.currentTarget as HTMLButtonElement
  target.parentElement
    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    .item(next)
    .focus()
}
</script>

<template>
  <div class="kawa-code-group">
    <div class="kawa-code-group__tabs" role="tablist">
      <button
        v-for="(label, index) in props.labels"
        :id="`${groupId}-tab-${index}`"
        :key="`${label}-${index}`"
        type="button"
        class="kawa-code-group__tab"
        role="tab"
        :aria-controls="`${groupId}-panel-${index}`"
        :aria-selected="activeIndex === index"
        :tabindex="activeIndex === index ? 0 : -1"
        @click="select(index)"
        @keydown="handleKeydown($event, index)"
      >
        {{ label }}
      </button>
    </div>

    <div class="kawa-code-group__panels">
      <div
        v-for="(_, index) in props.labels"
        :id="`${groupId}-panel-${index}`"
        :key="index"
        class="kawa-code-group__panel"
        role="tabpanel"
        :aria-labelledby="`${groupId}-tab-${index}`"
        :hidden="activeIndex !== index"
      >
        <slot :name="`panel-${index}`" />
      </div>
    </div>
  </div>
</template>
