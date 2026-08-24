<script setup lang="ts">
import { useLocale, useRouter } from 'kawapress/client'
import { computed, onUnmounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'

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
      <svg
        class="nagi-language-menu__icon"
        aria-hidden="true"
        viewBox="0 0 20 20"
      >
        <path fill="currentColor" d="M8 10a.5.5 0 0 1 .468.324l2.25 6a.5.5 0 0 1-.936.352L9.153 15H6.847l-.63 1.676a.5.5 0 0 1-.935-.352l2.25-6l.032-.07A.5.5 0 0 1 8 10m7.5 0a.5.5 0 0 1 .416.777L15.101 12H17.5a.5.5 0 0 1 0 1H15v2a1 1 0 0 1-1 1h-.5a.5.5 0 0 1 0-1h.5v-2h-2.5a.5.5 0 0 1 0-1H14a.5.5 0 0 1 .084-.277l.481-.723H12.5a.5.5 0 0 1 0-1zm-8.278 4h1.556L8 11.923zM7 2a5 5 0 0 1 5 5h-1.5c-.444 0-.84.194-1.115.5h-.396a11 11 0 0 1-.2 1.725a1.5 1.5 0 0 0-.976-.213c.089-.456.152-.965.175-1.512H6.012c.046 1.075.239 2.005.503 2.664l.005.012l-.637 1.697A5 5 0 0 1 7 2M3.032 7.5a4 4 0 0 0 2.66 3.28c-.375-.815-.63-1.973-.681-3.28zM14 7a.5.5 0 0 1 .5.5V8h3a.5.5 0 0 1 .5.5V10a.5.5 0 0 1-1 0V9h-6v1a.5.5 0 0 1-1 0V8.5a.5.5 0 0 1 .5-.5h3v-.5A.5.5 0 0 1 14 7M5.692 3.22a4 4 0 0 0-2.66 3.28h1.979c.052-1.307.305-2.466.681-3.28m1.256-.14c-.123.13-.28.373-.433.756c-.264.66-.457 1.589-.503 2.664h1.976c-.046-1.075-.239-2.005-.503-2.664c-.153-.383-.31-.625-.433-.756L7 3.031q-.022.018-.052.05m1.359.14c.376.814.63 1.973.682 3.28h1.979a4 4 0 0 0-2.661-3.28" />
      </svg>
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
