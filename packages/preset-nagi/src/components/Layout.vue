<script setup lang="ts">
import type { HeadLink } from 'kawapress/client'
import type { NagiHomeImage, NagiImageSource, NagiThemeableImage } from '../home'
import { RouterView, useHead, usePageData, useSite, withBase } from 'kawapress/client'
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'
import DocNavigation from './DocNavigation.vue'
import DocToolbar from './DocToolbar.vue'
import Home from './Home.vue'
import OsScroll from './OsScroll.vue'
import Outline from './Outline.vue'

const site = useSite()
const page = usePageData()
const theme = useNagiThemeConfig()
const layout = computed(() => {
  if (!page.value) {
    return 'page'
  }
  const value = page.value.frontmatter.layout
  return value === 'home' || value === 'page' ? value : 'doc'
})
const showSidebar = computed(() => Boolean(page.value) && layout.value === 'doc')
const sidebarOpen = shallowRef(false)
const outlineOpen = shallowRef(false)
const docScroll = useTemplateRef<InstanceType<typeof OsScroll>>('docScroll')

watch(() => page.value?.path, async () => {
  sidebarOpen.value = false
  outlineOpen.value = false
  await nextTick()
  returnToTop()
})

function returnToTop(): void {
  docScroll.value?.getScrollElement()?.scrollTo({ top: 0 })
}

useHead(() => {
  const title = page.value?.title
  const siteTitle = site.value.title
  return {
    title: !title || title === siteTitle ? siteTitle : `${title} | ${siteTitle}`,
    link: resolveFaviconLinks(theme.value.logo, site.value.base),
  }
})

function resolveFaviconLinks(
  image: NagiHomeImage | undefined,
  base: string,
): HeadLink[] {
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
  <div class="nagi" :class="`nagi--${layout}`">
    <NavBar />

    <div v-if="layout === 'doc'" class="nagi-content">
      <Sidebar v-if="showSidebar" mode="desktop" />

      <Transition name="nagi-backdrop">
        <div
          v-if="sidebarOpen"
          class="nagi-backdrop"
          aria-hidden="true"
          @click="sidebarOpen = false"
        />
      </Transition>
      <Transition name="nagi-sidebar-drawer">
        <Sidebar
          v-if="sidebarOpen"
          mode="drawer"
          @close="sidebarOpen = false"
        />
      </Transition>

      <main class="nagi-main nagi-main--doc">
        <DocToolbar
          :outline-open="outlineOpen"
          @close-outline="outlineOpen = false"
          @return-to-top="returnToTop"
          @toggle-outline="outlineOpen = !outlineOpen"
          @toggle-sidebar="sidebarOpen = !sidebarOpen"
        />
        <OsScroll ref="docScroll" class="nagi-main__scroll">
          <div class="nagi-main__content">
            <article class="nagi-doc">
              <RouterView />
            </article>
            <DocNavigation />
          </div>
        </OsScroll>
      </main>

      <aside class="nagi-outline-aside">
        <OsScroll class="nagi-outline-aside__scroll">
          <Outline />
        </OsScroll>
      </aside>
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
      <Footer />
    </OsScroll>
  </div>
</template>
