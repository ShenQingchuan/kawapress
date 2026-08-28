<script setup lang="ts">
import { useRouter, useSite } from 'kawapress/client'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'

interface Labels {
  actions: string
  copyMarkdown: string
  copyLink: string
  copiedMarkdown: string
  copiedLink: string
  failed: string
  moreActions: string
}

const ENGLISH_LABELS: Labels = {
  actions: 'Markdown actions',
  copyMarkdown: 'Copy page Markdown',
  copyLink: 'Copy Markdown link',
  copiedMarkdown: 'Markdown copied',
  copiedLink: 'Link copied',
  failed: 'Copy failed',
  moreActions: 'More Markdown actions',
}

const CHINESE_LABELS: Labels = {
  actions: 'Markdown 操作',
  copyMarkdown: '复制页面 Markdown',
  copyLink: '复制 Markdown 链接',
  copiedMarkdown: '已复制 Markdown',
  copiedLink: '已复制链接',
  failed: '复制失败',
  moreActions: '更多 Markdown 操作',
}

const router = useRouter()
const site = useSite()
const root = useTemplateRef<HTMLElement>('root')
const menuItem = useTemplateRef<HTMLButtonElement>('menuItem')
const toggle = useTemplateRef<HTMLButtonElement>('toggle')
const open = shallowRef(false)
const loading = shallowRef(false)
const primaryStatus = shallowRef('')
const linkStatus = shallowRef('')
let primaryTimer: ReturnType<typeof setTimeout> | undefined
let linkTimer: ReturnType<typeof setTimeout> | undefined
let primaryAbortController: AbortController | undefined
let routeRevision = 0

const labels = computed(() => (
  /^zh(?:-|$)/i.test(site.value.lang ?? '')
    ? CHINESE_LABELS
    : ENGLISH_LABELS
))
const primaryLabel = computed(() => (
  primaryStatus.value || labels.value.copyMarkdown
))
const linkLabel = computed(() => linkStatus.value || labels.value.copyLink)
const markdownPath = computed(() => markdownUrl(
  router.currentRoute.value.path,
  site.value.localeIndex,
  site.value.base,
))

async function copyMarkdown(): Promise<void> {
  if (loading.value) {
    return
  }

  const revision = routeRevision
  const abortController = new AbortController()
  primaryAbortController = abortController
  loading.value = true
  primaryStatus.value = ''

  try {
    const response = await fetch(markdownPath.value, {
      signal: abortController.signal,
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const content = await response.text()
    if (revision !== routeRevision) {
      return
    }

    await copyText(content)
    if (revision === routeRevision) {
      showPrimaryStatus(labels.value.copiedMarkdown)
    }
  }
  catch {
    if (revision === routeRevision) {
      showPrimaryStatus(labels.value.failed)
    }
  }
  finally {
    if (primaryAbortController === abortController) {
      primaryAbortController = undefined
    }
    if (revision === routeRevision) {
      loading.value = false
    }
  }
}

async function copyLink(): Promise<void> {
  const revision = routeRevision
  try {
    const link = new URL(markdownPath.value, window.location.origin).href
    await copyText(link)
    if (revision === routeRevision) {
      showLinkStatus(labels.value.copiedLink)
    }
  }
  catch {
    if (revision === routeRevision) {
      showLinkStatus(labels.value.failed)
    }
  }
}

function toggleMenu(): void {
  open.value = !open.value
}

async function openMenu(): Promise<void> {
  open.value = true
  await nextTick()
  menuItem.value?.focus()
}

function closeMenu(restoreFocus = false): void {
  if (!open.value) {
    return
  }
  open.value = false
  if (restoreFocus) {
    void nextTick(() => toggle.value?.focus())
  }
}

function handleDocumentClick(event: MouseEvent): void {
  if (!root.value?.contains(event.target as Node)) {
    closeMenu()
  }
}

function handleDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    closeMenu(true)
  }
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const input = document.createElement('textarea')
  input.value = value
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.append(input)
  input.select()
  const copied = document.execCommand('copy')
  input.remove()
  if (!copied) {
    throw new Error('Clipboard is unavailable')
  }
}

function showPrimaryStatus(message: string): void {
  clearTimeout(primaryTimer)
  primaryStatus.value = message
  primaryTimer = setTimeout(() => {
    primaryStatus.value = ''
    primaryTimer = undefined
  }, 2000)
}

function showLinkStatus(message: string): void {
  clearTimeout(linkTimer)
  linkStatus.value = message
  linkTimer = setTimeout(() => {
    linkStatus.value = ''
    linkTimer = undefined
  }, 2000)
}

function clearTransientState(): void {
  routeRevision += 1
  primaryAbortController?.abort()
  primaryAbortController = undefined
  clearTimeout(primaryTimer)
  clearTimeout(linkTimer)
  primaryTimer = undefined
  linkTimer = undefined
  primaryStatus.value = ''
  linkStatus.value = ''
  loading.value = false
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  clearTransientState()
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleDocumentKeydown)
})

watch(() => router.currentRoute.value.path, () => {
  clearTransientState()
  closeMenu()
}, { flush: 'sync' })

function markdownUrl(routePath: string, locale: string, base: string): string {
  let path: string
  if (routePath === '/') {
    path = '/index.md'
  }
  else if (locale !== 'root' && routePath === `/${locale}`) {
    path = `/${locale}/index.md`
  }
  else if (routePath.endsWith('/')) {
    path = `${routePath}index.md`
  }
  else {
    path = `${routePath}.md`
  }

  return base === '/'
    ? path
    : `${base.replace(/\/$/, '')}${path}`
}
</script>

<template>
  <div
    ref="root"
    class="kawa-llms-actions"
    role="group"
    :aria-label="labels.actions"
  >
    <div class="kawa-llms-actions__group">
      <button
        class="kawa-llms-actions__button kawa-llms-actions__button--primary"
        type="button"
        :aria-busy="loading"
        @click="copyMarkdown"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M8 8h11v11H8z" />
          <path d="M5 16H3V3h13v2" />
        </svg>
        <span>{{ primaryLabel }}</span>
      </button>

      <button
        ref="toggle"
        class="kawa-llms-actions__button kawa-llms-actions__button--toggle"
        type="button"
        :aria-label="labels.moreActions"
        aria-controls="kawa-llms-actions-menu"
        :aria-expanded="open"
        @click="toggleMenu"
        @keydown.down.prevent="openMenu"
      >
        <svg class="kawa-llms-actions__chevron" aria-hidden="true" viewBox="0 0 24 24">
          <path d="m7 9.5 5 5 5-5" />
        </svg>
      </button>
    </div>

    <div
      v-if="open"
      id="kawa-llms-actions-menu"
      class="kawa-llms-actions__menu"
      role="menu"
    >
      <button
        ref="menuItem"
        class="kawa-llms-actions__menu-item"
        type="button"
        role="menuitem"
        @click="copyLink"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M9 7H7a5 5 0 0 0 0 10h2" />
          <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
          <path d="M8 12h8" />
        </svg>
        <span>{{ linkLabel }}</span>
      </button>
    </div>
  </div>
</template>
