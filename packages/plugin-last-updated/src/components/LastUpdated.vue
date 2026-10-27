<script setup lang="ts">
import { usePageData, useSite } from 'kawapress/client'
import { computed, onMounted, shallowRef } from 'vue'
import { formatLastUpdatedDate } from '../format'
import { resolveLastUpdatedTexts } from '../labels'
import { runtimeOptions } from '../runtime-options'

const site = useSite()
const page = usePageData()
/** Set after hydration, so server and first client render both use UTC. */
const mounted = shallowRef(false)

onMounted(() => {
  mounted.value = true
})

const lang = computed(() => site.value.lang ?? 'en')
const texts = computed(() => resolveLastUpdatedTexts({
  lang: lang.value,
  localeIndex: site.value.localeIndex,
  labels: runtimeOptions.labels,
  localeLabels: runtimeOptions.localeLabels,
}))

const lastUpdated = computed(() => {
  const value = page.value?.lastUpdated
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
})
const editLink = computed(() => {
  const value = page.value?.editLink
  return typeof value === 'string' && value.length > 0 ? value : undefined
})

const showDate = computed(() => (
  lastUpdated.value !== undefined && page.value?.frontmatter.lastUpdated !== false
))
const showEditLink = computed(() => (
  editLink.value !== undefined && page.value?.frontmatter.editLink !== false
))
const visible = computed(() => showDate.value || showEditLink.value)

/**
 * An explicit `timeZone` in the options is a deliberate choice, so it wins over
 * the visitor's zone. Otherwise the server renders in UTC and the browser
 * re-renders in its own zone once mounted.
 */
const explicitTimeZone = typeof runtimeOptions.formatOptions?.timeZone === 'string'
  ? runtimeOptions.formatOptions.timeZone
  : undefined
const timeZone = computed(() => (
  explicitTimeZone ?? (mounted.value ? undefined : 'UTC')
))

const iso = computed(() => new Date(lastUpdated.value ?? 0).toISOString())
const formatted = computed(() => formatLastUpdatedDate(
  lastUpdated.value ?? 0,
  lang.value,
  runtimeOptions.formatOptions,
  timeZone.value,
))
</script>

<template>
  <p v-if="visible" class="kawa-last-updated">
    <a
      v-if="showEditLink"
      class="kawa-last-updated__edit"
      :href="editLink"
      rel="noopener noreferrer"
      target="_blank"
    >
      <svg class="kawa-last-updated__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
      </svg>
      <span>{{ texts.editLink }}</span>
    </a>
    <span v-if="showDate" class="kawa-last-updated__text">
      <span class="kawa-last-updated__label">{{ texts.lastUpdated }}</span>
      <time class="kawa-last-updated__time" :datetime="iso">{{ formatted }}</time>
    </span>
  </p>
</template>
