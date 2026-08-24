<script setup lang="ts">
import type { SearchTranslations } from '../translations'
import { useRouter } from 'kawapress/client'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue'
import { useLocalSearch } from '../composables/useLocalSearch'
import SearchResult from './SearchResult.vue'

interface Props {
  translations: SearchTranslations
}

interface Emits {
  close: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()
const { load, query, results, status } = useLocalSearch()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const input = useTemplateRef<HTMLInputElement>('input')
const resultsScroll = useTemplateRef<HTMLElement>('resultsScroll')
const selectedIndex = shallowRef(-1)
const hasQuery = computed(() => query.value.trim().length > 0)
const activeDescendant = computed(() => (
  selectedIndex.value >= 0 ? `kawa-search-result-${selectedIndex.value}` : undefined
))

watch(results, (items) => {
  selectedIndex.value = items.length > 0 ? 0 : -1
  scrollToSelectedResult()
})

onMounted(async () => {
  if (!dialog.value?.open) {
    dialog.value?.showModal()
  }
  await nextTick()
  input.value?.focus()
})

onBeforeUnmount(() => {
  if (dialog.value?.open) {
    dialog.value.close()
  }
})

function close(): void {
  if (dialog.value?.open) {
    dialog.value.close()
  }
  emit('close')
}

function handleDialogClick(event: MouseEvent): void {
  if (event.target === dialog.value) {
    close()
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectResult(1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectResult(-1)
    return
  }
  if (event.key === 'Enter'
    && !(event.target instanceof HTMLAnchorElement)
    && selectedIndex.value >= 0) {
    event.preventDefault()
    const result = results.value[selectedIndex.value]
    if (result) {
      router.push(result.id)
      close()
    }
  }
}

function selectResult(offset: number): void {
  if (results.value.length === 0) {
    selectedIndex.value = -1
    return
  }
  selectedIndex.value = (
    selectedIndex.value + offset + results.value.length
  ) % results.value.length
  scrollToSelectedResult()
}

async function scrollToSelectedResult(): Promise<void> {
  await nextTick()
  resultsScroll.value
    ?.querySelector(`[data-search-index="${selectedIndex.value}"]`)
    ?.scrollIntoView({ block: 'nearest' })
}
</script>

<template>
  <dialog
    ref="dialog"
    class="kawa-search"
    :aria-label="props.translations.buttonLabel"
    @cancel.prevent="close"
    @click="handleDialogClick"
    @keydown="handleKeydown"
  >
    <div class="kawa-search__panel">
      <form class="kawa-search__form" role="search" @submit.prevent>
        <svg class="kawa-search__icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
        <label class="kawa-search__label" for="kawa-search-input">
          {{ props.translations.placeholder }}
        </label>
        <input
          id="kawa-search-input"
          ref="input"
          v-model="query"
          class="kawa-search__input"
          type="search"
          role="combobox"
          :placeholder="props.translations.placeholder"
          :aria-activedescendant="activeDescendant"
          :aria-controls="results.length ? 'kawa-search-results' : undefined"
          :aria-expanded="results.length > 0"
          aria-autocomplete="list"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
        >
        <button
          type="button"
          class="kawa-search__close"
          :aria-label="props.translations.closeLabel"
          @click="close"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m7 7 10 10M17 7 7 17" />
          </svg>
        </button>
      </form>

      <div class="kawa-search__body" aria-live="polite">
        <p v-if="status === 'loading'" class="kawa-search__state" role="status">
          <span class="kawa-search__loader" aria-hidden="true" />
          {{ props.translations.loadingLabel }}
        </p>
        <div v-else-if="status === 'error'" class="kawa-search__state" role="alert">
          <span>{{ props.translations.errorLabel }}</span>
          <button type="button" class="kawa-search__retry" @click="load">
            {{ props.translations.retryLabel }}
          </button>
        </div>
        <p v-else-if="!hasQuery" class="kawa-search__state">
          {{ props.translations.emptyLabel }}
        </p>
        <p v-else-if="results.length === 0" class="kawa-search__state">
          {{ props.translations.noResultsLabel }} “<strong>{{ query.trim() }}</strong>”
        </p>
        <div v-else ref="resultsScroll" class="kawa-search__results-scroll">
          <ul id="kawa-search-results" class="kawa-search__results" role="listbox">
            <li
              v-for="(result, index) in results"
              :id="`kawa-search-result-${index}`"
              :key="result.id"
              role="option"
              :aria-selected="selectedIndex === index"
              :data-search-index="index"
            >
              <SearchResult
                :result="result"
                :query="query"
                :selected="selectedIndex === index"
                @activate="selectedIndex = index"
                @choose="close"
              />
            </li>
          </ul>
        </div>
      </div>

      <div class="kawa-search__shortcuts" aria-hidden="true">
        <span><kbd>↑</kbd><kbd>↓</kbd>{{ props.translations.navigateLabel }}</span>
        <span><kbd>↵</kbd>{{ props.translations.selectLabel }}</span>
        <span><kbd>Esc</kbd>{{ props.translations.closeLabel }}</span>
      </div>
    </div>
  </dialog>
</template>
