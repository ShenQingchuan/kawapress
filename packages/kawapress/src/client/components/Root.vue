<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { resolveDocumentTitle } from '../../core/page-metadata'
import { usePageData, useSite } from '../composables'

const site = useSite()
const page = usePageData()

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
</script>

<template>
  <Layout />
</template>
