<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { headConfigToUnheadInput } from '../../core/head'
import { resolveDocumentTitle } from '../../core/page-metadata'
import { usePageData, useSite } from '../composables'

const site = useSite()
const page = usePageData()

// Registered first so that user head tags can replace the generated description.
useHead(() => ({
  htmlAttrs: {
    lang: site.value.lang,
    dir: site.value.dir,
  },
  title: resolveDocumentTitle(
    page.value ?? { title: '' },
    site.value.title,
  ),
  meta: page.value?.description
    ? [{
        key: 'description',
        name: 'description',
        content: page.value.description,
      }]
    : [],
}))

// Later entries win on duplicate tags, so the order is site, locale, then page.
useHead(() => headConfigToUnheadInput(site.value.head))
useHead(() => headConfigToUnheadInput(site.value.localeHead))
useHead(() => headConfigToUnheadInput(page.value?.head ?? []))
</script>

<template>
  <Layout />
</template>
