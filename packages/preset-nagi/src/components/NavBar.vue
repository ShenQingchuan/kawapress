<script setup lang="ts">
import { Search } from '@kawapress/plugin-search/client'
import { useRouter, useSite } from 'kawapress/client'
import { onMounted, onUnmounted, shallowRef, watch } from 'vue'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'
import AppearanceSwitch from './AppearanceSwitch.vue'
import GitHubLink from './GitHubLink.vue'
import LanguageMenu from './LanguageMenu.vue'
import NavScreen from './NavScreen.vue'
import ThemeableImage from './ThemeableImage.vue'

const site = useSite()
const theme = useNagiThemeConfig()
const router = useRouter()
const screenOpen = shallowRef(false)

let desktopQuery: MediaQueryList | undefined

function closeScreenOnDesktop(): void {
  if (desktopQuery?.matches) {
    screenOpen.value = false
  }
}

watch(() => router.currentRoute.value.fullPath, () => {
  screenOpen.value = false
})

onMounted(() => {
  desktopQuery = window.matchMedia('(min-width: 60rem)')
  desktopQuery.addEventListener('change', closeScreenOnDesktop)
})

onUnmounted(() => {
  desktopQuery?.removeEventListener('change', closeScreenOnDesktop)
})
</script>

<template>
  <div class="nagi-nav-bar">
    <header class="nagi-nav">
      <a :href="site.link" class="nagi-nav__title">
        <ThemeableImage
          v-if="theme.logo"
          :image="theme.logo"
          alt=""
          class="nagi-nav__logo"
        />
        <span>{{ site.title }}</span>
      </a>
      <div class="nagi-nav__end">
        <Search />
        <div class="nagi-nav__controls nagi-nav__controls--desktop">
          <LanguageMenu />
          <AppearanceSwitch />
          <GitHubLink />
        </div>
        <button
          type="button"
          class="nagi-nav__menu"
          aria-controls="nagi-nav-screen"
          :aria-expanded="screenOpen"
          :aria-label="theme.navMenuLabel"
          :title="theme.navMenuLabel"
          @click="screenOpen = !screenOpen"
        >
          <span class="nagi-nav__menu-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>
    </header>

    <Transition name="nagi-nav-screen">
      <NavScreen v-if="screenOpen" @close="screenOpen = false" />
    </Transition>
  </div>
</template>
