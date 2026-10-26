<script setup lang="ts">
import type { LastUpdatedPageData } from '../types'
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

const frontmatter = computed<Record<string, unknown>>(
  () => page.value?.frontmatter ?? {},
)
const lastUpdated = computed(() => {
  const value = (page.value as LastUpdatedPageData | undefined)?.lastUpdated
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
})
const editLink = computed(() => {
  const value = (page.value as LastUpdatedPageData | undefined)?.editLink
  return typeof value === 'string' && value.length > 0 ? value : undefined
})

const showDate = computed(() => (
  lastUpdated.value !== undefined && frontmatter.value.lastUpdated !== false
))
const showEditLink = computed(() => (
  editLink.value !== undefined && frontmatter.value.editLink !== false
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
    >{{ texts.editLink }}</a>
    <span v-if="showDate" class="kawa-last-updated__text">
      <span class="kawa-last-updated__label">{{ texts.lastUpdated }}</span>
      <time class="kawa-last-updated__time" :datetime="iso">{{ formatted }}</time>
    </span>
  </p>
</template>
