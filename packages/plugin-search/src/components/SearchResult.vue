<script setup lang="ts">
import type { LocalSearchResult } from '../search'
import { useSite, withBase } from 'kawapress/client'
import { computed } from 'vue'
import { createSearchExcerpt, highlightSearchText } from '../search-highlight'

interface Props {
  result: LocalSearchResult
  query: string
  selected: boolean
}

interface Emits {
  activate: []
  choose: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const site = useSite()
const href = computed(() => withBase(props.result.id, site.value.base))
const titleParts = computed(() => highlightSearchText(
  props.result.title,
  props.query,
))
const excerptParts = computed(() => highlightSearchText(
  createSearchExcerpt(props.result.text, props.query),
  props.query,
))
const ariaLabel = computed(() => (
  [...props.result.titles, props.result.title].join(' › ')
))
</script>

<template>
  <a
    :href="href"
    class="kawa-search-result"
    :class="{ 'is-selected': props.selected }"
    :aria-label="ariaLabel"
    @click="emit('choose')"
    @focus="emit('activate')"
    @mouseenter="emit('activate')"
  >
    <span v-if="props.result.titles.length" class="kawa-search-result__path">
      {{ props.result.titles.join(' › ') }}
    </span>
    <span class="kawa-search-result__title">
      <template v-for="(part, index) in titleParts" :key="index">
        <mark v-if="part.highlighted">{{ part.text }}</mark>
        <template v-else>{{ part.text }}</template>
      </template>
    </span>
    <span v-if="props.result.text" class="kawa-search-result__excerpt">
      <template v-for="(part, index) in excerptParts" :key="index">
        <mark v-if="part.highlighted">{{ part.text }}</mark>
        <template v-else>{{ part.text }}</template>
      </template>
    </span>
  </a>
</template>
