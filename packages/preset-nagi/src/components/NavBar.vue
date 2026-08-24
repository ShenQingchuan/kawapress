<script setup lang="ts">
import { useSite } from 'kawapress/client'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'
import AppearanceSwitch from './AppearanceSwitch.vue'
import GitHubLink from './GitHubLink.vue'
import LanguageMenu from './LanguageMenu.vue'
import ThemeableImage from './ThemeableImage.vue'

const site = useSite()
const theme = useNagiThemeConfig()
</script>

<template>
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
    <div class="nagi-nav__controls">
      <LanguageMenu />
      <AppearanceSwitch />
      <GitHubLink />
    </div>
  </header>
</template>
