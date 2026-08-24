<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'
import AppearanceSwitch from './AppearanceSwitch.vue'
import GitHubLink from './GitHubLink.vue'
import LanguageMenu from './LanguageMenu.vue'
import OsScroll from './OsScroll.vue'

const emit = defineEmits<{
  close: []
}>()

const theme = useNagiThemeConfig()
const screen = useTemplateRef<HTMLElement>('screen')

onMounted(() => {
  screen.value?.focus()
})
</script>

<template>
  <nav
    id="nagi-nav-screen"
    ref="screen"
    class="nagi-nav-screen"
    :aria-label="theme.navMenuLabel"
    tabindex="-1"
    @keydown.esc="emit('close')"
  >
    <OsScroll class="nagi-nav-screen__scroll">
      <div class="nagi-nav-screen__body">
        <LanguageMenu variant="list" @navigate="emit('close')" />
        <div class="nagi-nav-screen__actions">
          <AppearanceSwitch />
          <GitHubLink />
        </div>
      </div>
    </OsScroll>
  </nav>
</template>
