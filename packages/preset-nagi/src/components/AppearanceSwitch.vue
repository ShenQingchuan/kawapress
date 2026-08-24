<script setup lang="ts">
import { toggleAppearance } from '../appearance'
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'

const theme = useNagiThemeConfig()
</script>

<template>
  <button
    type="button"
    class="nagi-appearance-switch"
    :aria-label="theme.appearanceLabel"
    :title="theme.appearanceLabel"
    @click="toggleAppearance"
  >
    <svg
      class="nagi-appearance-switch__icon nagi-appearance-switch__sun"
      aria-hidden="true"
      viewBox="0 0 20 20"
    >
      <circle cx="10" cy="10" r="3.25" />
      <path d="M10 1.75v1.5M10 16.75v1.5M1.75 10h1.5M16.75 10h1.5M4.17 4.17l1.06 1.06M14.77 14.77l1.06 1.06M15.83 4.17l-1.06 1.06M5.23 14.77l-1.06 1.06" />
    </svg>
    <svg
      class="nagi-appearance-switch__icon nagi-appearance-switch__moon"
      aria-hidden="true"
      viewBox="0 0 20 20"
    >
      <path d="M16.75 12.34A7.25 7.25 0 0 1 7.66 3.25a7.25 7.25 0 1 0 9.09 9.09Z" />
    </svg>
  </button>
</template>
