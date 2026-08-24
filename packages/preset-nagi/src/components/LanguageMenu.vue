<script setup lang="ts">
import { useLocale, useRouter } from 'kawapress/client'
import { computed, shallowRef, watch } from 'vue'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'

const router = useRouter()
const theme = useNagiThemeConfig()
const { localeIndex, locale, localeLinks } = useLocale()
const open = shallowRef(false)
const currentLabel = computed(
  () => locale.value?.label ?? localeIndex.value,
)

watch(() => router.currentRoute.value.fullPath, () => {
  open.value = false
})
</script>

<template>
  <div
    v-if="localeLinks.length"
    class="nagi-language-menu"
    @keydown.esc="open = false"
  >
    <button
      type="button"
      class="nagi-language-menu__button"
      aria-controls="nagi-language-menu-items"
      aria-haspopup="true"
      :aria-expanded="open"
      :aria-label="theme.langMenuLabel"
      :title="theme.langMenuLabel"
      @click="open = !open"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
      </svg>
      <span>{{ currentLabel }}</span>
      <svg class="nagi-language-menu__chevron" aria-hidden="true" viewBox="0 0 24 24">
        <path d="m8 10 4 4 4-4" />
      </svg>
    </button>

    <Transition name="nagi-outline-dropdown">
      <ul
        v-show="open"
        id="nagi-language-menu-items"
        class="nagi-language-menu__items"
      >
        <li v-for="item in localeLinks" :key="item.localeIndex">
          <a
            class="nagi-language-menu__link"
            :href="item.link"
            :lang="item.lang"
            :hreflang="item.lang"
            :dir="item.dir"
            rel="alternate"
            @click="open = false"
          >
            {{ item.label }}
          </a>
        </li>
      </ul>
    </Transition>
  </div>
</template>
