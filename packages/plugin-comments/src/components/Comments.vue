<script setup lang="ts">
import type { CommentsThread } from '../provider'
import { usePageData, useSite } from 'kawapress/client'
import { computed, onBeforeUnmount, useId, useTemplateRef, watch } from 'vue'
import { useCommentsAppearance } from '../composables/useCommentsAppearance'
import { createGiscusProvider, resolveGiscusLang } from '../providers/giscus'
import commentsOptions from '../runtime-options'
import { resolveCommentsLabels } from '../translations'

/** How far outside the viewport the comment section starts loading. */
const PRELOAD_MARGIN = '200px'

const site = useSite()
const page = usePageData()
const section = useTemplateRef<HTMLElement>('section')
const threadHost = useTemplateRef<HTMLElement>('thread')
const appearance = useCommentsAppearance()
const provider = createGiscusProvider(commentsOptions.giscus)
const headingId = useId()

const labels = computed(() => resolveCommentsLabels(
  commentsOptions,
  site.value.localeIndex,
  site.value.lang,
))
const lang = computed(() => resolveGiscusLang(site.value.lang))
const enabled = computed(() => page.value?.frontmatter.comments !== false)
const pagePath = computed(() => page.value?.path ?? '')

/** The mounted widget, once the section reached the viewport. */
let activeThread: CommentsThread | undefined
let activeThreadPath: string | undefined
let reachedViewport = false
let observer: IntersectionObserver | undefined

// The section element is created and removed by `v-if`, so the observer follows it.
watch(section, () => {
  stopObserving()
  closeThread()
  reachedViewport = false
  observeSection()
}, { flush: 'post' })

// A reused instance must show the discussion of the new page, and giscus finds
// that discussion from the live URL and page title. Rebuilding the widget is
// therefore more reliable than patching a live iframe through `setConfig`.
watch(pagePath, () => {
  if (reachedViewport) {
    mountThread()
  }
}, { flush: 'post' })

watch(appearance, (value) => {
  activeThread?.setAppearance(value)
})

onBeforeUnmount(() => {
  stopObserving()
  closeThread()
})

function observeSection(): void {
  const element = section.value
  if (import.meta.env.SSR || !element) {
    return
  }
  if (typeof IntersectionObserver === 'undefined') {
    loadThread()
    return
  }
  observer = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) {
      loadThread()
    }
  }, { rootMargin: PRELOAD_MARGIN })
  observer.observe(element)
}

function stopObserving(): void {
  observer?.disconnect()
  observer = undefined
}

function loadThread(): void {
  reachedViewport = true
  stopObserving()
  mountThread()
}

function mountThread(): void {
  const host = threadHost.value
  if (!host || !enabled.value) {
    return
  }
  const path = pagePath.value
  if (activeThread && activeThreadPath === path) {
    return
  }
  closeThread()
  activeThread = provider.create(host, {
    appearance: appearance.value,
    lang: lang.value,
  })
  activeThreadPath = path
}

function closeThread(): void {
  activeThread?.destroy()
  activeThread = undefined
  activeThreadPath = undefined
}
</script>

<template>
  <section
    v-if="enabled"
    ref="section"
    class="kawa-comments"
    :aria-labelledby="headingId"
  >
    <h2 :id="headingId" class="kawa-comments__heading">
      {{ labels.heading }}
    </h2>
    <div ref="thread" class="kawa-comments__thread" />
  </section>
</template>
