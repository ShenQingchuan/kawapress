<script setup lang="ts">
import type { Link } from '@unhead/vue'
import type { NagiHomeImage, NagiImageSource, NagiThemeableImage } from '../home'
import { useHead } from '@unhead/vue'
import { RouterView, usePageData, useSite, withBase } from 'kawapress/client'
import { computed, nextTick, provide, shallowRef, useTemplateRef, watch } from 'vue'
import appearanceInitializerScript from '../appearance-initializer.js?raw'
import { nagiDocScrollKey } from '../composables/docScroll'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'
import { resolveNagiPageOptions } from '../frontmatter'
import { getOutlineHeaders } from '../outline'
import DocNavigation from './DocNavigation.vue'
import DocToolbar from './DocToolbar.vue'
import Home from './Home.vue'
import OsScroll from './OsScroll.vue'
import OutlineAside from './OutlineAside.vue'

const site = useSite()
const page = usePageData()
const theme = useNagiThemeConfig()
const pageOptions = computed(() => resolveNagiPageOptions(
  page.value?.frontmatter ?? {},
))
const layout = computed(() => page.value ? pageOptions.value.layout : 'page')
const showSidebar = computed(() => (
  Boolean(page.value)
  && layout.value === 'doc'
  && pageOptions.value.sidebar
))
const hasPageOutline = computed(() => (
  pageOptions.value.outline
  && getOutlineHeaders(page.value?.headers ?? []).length > 0
))
const showOutlineAside = computed(() => (
  hasPageOutline.value && pageOptions.value.aside
))
const sidebarOpen = shallowRef(false)
const outlineOpen = shallowRef(false)
const outlineAsideCollapsed = shallowRef(false)
const docScroll = useTemplateRef<InstanceType<typeof OsScroll>>('docScroll')

provide(nagiDocScrollKey, () => docScroll.value?.getScrollElement() ?? null)

watch(() => page.value?.path, async () => {
  sidebarOpen.value = false
  outlineOpen.value = false
  await nextTick()
  returnToTop()
})

function returnToTop(): void {
  docScroll.value?.getScrollElement()?.scrollTo({ top: 0 })
}

useHead(() => ({
  link: resolveFaviconLinks(theme.value.logo, site.value.base),
  script: [{
    id: 'nagi-initial-appearance',
    textContent: appearanceInitializerScript,
  }],
}))

function resolveFaviconLinks(
  image: NagiHomeImage | undefined,
  base: string,
): Link[] {
  if (!image) {
    return []
  }
  if (isThemeableImage(image)) {
    return [{
      id: 'nagi-favicon-light',
      rel: 'icon',
      href: withBase(resolveImageSrc(image.light), base),
      media: '(prefers-color-scheme: light)',
    }, {
      id: 'nagi-favicon-dark',
      rel: 'icon',
      href: withBase(resolveImageSrc(image.dark), base),
      media: '(prefers-color-scheme: dark)',
    }]
  }
  return [{
    id: 'nagi-favicon',
    rel: 'icon',
    href: withBase(resolveImageSrc(image), base),
  }]
}

function isThemeableImage(image: NagiHomeImage): image is NagiThemeableImage {
  return typeof image === 'object' && 'light' in image && 'dark' in image
}

function resolveImageSrc(image: string | NagiImageSource): string {
  return typeof image === 'string' ? image : image.src
}
</script>

<template>
  <div
    class="nagi"
    :class="[`nagi--${layout}`, pageOptions.pageClass]"
  >
    <NavBar v-if="pageOptions.navbar" />

    <div
      v-if="layout === 'doc'"
      class="nagi-content"
      :class="{
        'nagi-content--wide-doc': !showOutlineAside || outlineAsideCollapsed,
      }"
    >
      <Sidebar v-if="showSidebar" mode="desktop" />

      <Transition name="nagi-backdrop">
        <div
          v-if="showSidebar && sidebarOpen"
          class="nagi-backdrop"
          aria-hidden="true"
          @click="sidebarOpen = false"
        />
      </Transition>
      <Transition name="nagi-sidebar-drawer">
        <Sidebar
          v-if="showSidebar && sidebarOpen"
          mode="drawer"
          @close="sidebarOpen = false"
        />
      </Transition>

      <main class="nagi-main nagi-main--doc">
        <DocToolbar
          v-if="showSidebar || hasPageOutline"
          :outline-enabled="hasPageOutline"
          :outline-open="outlineOpen"
          :sidebar-enabled="showSidebar"
          @close-outline="outlineOpen = false"
          @return-to-top="returnToTop"
          @toggle-outline="outlineOpen = !outlineOpen"
          @toggle-sidebar="sidebarOpen = !sidebarOpen"
        />
        <OsScroll ref="docScroll" class="nagi-main__scroll" :defer="false">
          <div class="nagi-main__content">
            <article class="nagi-doc">
              <RouterView />
            </article>
            <DocNavigation />
          </div>
        </OsScroll>
      </main>

      <OutlineAside
        v-if="showOutlineAside"
        :collapsed="outlineAsideCollapsed"
        @toggle="outlineAsideCollapsed = !outlineAsideCollapsed"
      />
    </div>

    <OsScroll v-else class="nagi-page-scroll">
      <main v-if="layout === 'home'" class="nagi-main nagi-main--home">
        <Home />
      </main>
      <main v-else class="nagi-main nagi-main--page">
        <div class="nagi-main__content nagi-doc">
          <RouterView />
        </div>
      </main>
      <Footer v-if="pageOptions.footer" />
    </OsScroll>
  </div>
</template>
