<script setup lang="ts">
import { RouterView, useHead, usePageData, useSite } from 'kawapress/client'
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import DocToolbar from './DocToolbar.vue'
import OsScroll from './OsScroll.vue'
import Outline from './Outline.vue'

const site = useSite()
const page = usePageData()
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

useHead({
  title: computed(() => {
    const title = page.value?.title
    const siteTitle = site.value.title
    return !title || title === siteTitle ? siteTitle : `${title} | ${siteTitle}`
  }),
})
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
          <div class="nagi-main__content nagi-doc">
            <RouterView />
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
      <main class="nagi-main" :class="`nagi-main--${layout}`">
        <div class="nagi-main__content nagi-doc">
          <RouterView />
        </div>
      </main>
      <Footer />
    </OsScroll>
  </div>
</template>
