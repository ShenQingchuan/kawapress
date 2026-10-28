<script setup lang="ts">
import { useNagiThemeConfig } from '../composables/useNagiThemeConfig'

const theme = useNagiThemeConfig()
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="nagi-footer">
    <KawaOutlet name="layout.footer">
      <p class="nagi-footer__license">
        {{ theme.footerLicenseText }}
      </p>
      <p class="nagi-footer__copyright">
        © {{ currentYear }} {{ theme.footerPoweredByText }}
      </p>
    </KawaOutlet>
  </footer>
</template>
