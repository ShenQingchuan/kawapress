<script setup lang="ts">
import { useLocale, useRouter } from 'kawapress/client'
import { computed, onUnmounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'
import NagiLanguageIcon from './NagiLanguageIcon.vue'

const props = withDefaults(defineProps<{
  variant?: 'dropdown' | 'list'
}>(), {
  variant: 'dropdown',
})

const emit = defineEmits<{
  navigate: []
}>()

const router = useRouter()
const theme = useNagiThemeConfig()
const { localeIndex, locales } = useLocale()
const open = shallowRef(false)
const root = useTemplateRef<HTMLElement>('root')
const menuId = useId()
const isDropdown = computed(() => props.variant === 'dropdown')

watch(() => router.currentRoute.value.fullPath, () => {
  open.value = false
})

function onDocumentPointerDown(event: PointerEvent): void {
  if (!root.value?.contains(event.target as Node)) {
    open.value = false
  }
}

watch(open, (isOpen) => {
  if (import.meta.env.SSR) {
    return
  }
  if (isOpen) {
    document.addEventListener('pointerdown', onDocumentPointerDown)
    return
  }
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})

onUnmounted(() => {
  if (!import.meta.env.SSR) {
    document.removeEventListener('pointerdown', onDocumentPointerDown)
  }
})

function onSelect(): void {
  open.value = false
  emit('navigate')
}
</script>

<template>
  <div
    v-if="locales.length > 1"
    ref="root"
    class="nagi-language-menu"
    :class="`nagi-language-menu--${props.variant}`"
    @keydown.esc="open = false"
  >
    <p v-if="!isDropdown" class="nagi-language-menu__title">
      {{ theme.langMenuLabel }}
    </p>

    <button
      v-if="isDropdown"
      type="button"
      class="nagi-language-menu__button"
      :aria-controls="menuId"
      aria-haspopup="true"
      :aria-expanded="open"
      :aria-label="theme.langMenuLabel"
      :title="theme.langMenuLabel"
      @click="open = !open"
    >
      <NagiLanguageIcon
        class="nagi-language-menu__icon"
        aria-hidden="true"
      />
    </button>

    <Transition name="nagi-outline-dropdown" :css="isDropdown">
      <ul
        v-show="!isDropdown || open"
        :id="isDropdown ? menuId : undefined"
        class="nagi-language-menu__items"
      >
        <li v-for="item in locales" :key="item.localeIndex">
          <a
            class="nagi-language-menu__link"
            :class="{ 'is-active': item.localeIndex === localeIndex }"
            :href="item.link"
            :lang="item.lang"
            :hreflang="item.lang"
            :dir="item.dir"
            :aria-current="item.localeIndex === localeIndex ? 'page' : undefined"
            rel="alternate"
            @click="onSelect"
          >
            {{ item.label }}
          </a>
        </li>
      </ul>
    </Transition>
  </div>
</template>
