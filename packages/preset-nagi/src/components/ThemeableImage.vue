<script setup lang="ts">
import type {
  NagiHomeImage,
  NagiImageSource,
  NagiThemeableImage,
} from '../home'
import { useSite, withBase } from 'kawapress/client'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  image: NagiHomeImage
  alt?: string
}>()

const site = useSite()

function isThemeableImage(image: NagiHomeImage): image is NagiThemeableImage {
  return typeof image === 'object' && 'light' in image && 'dark' in image
}

function resolveSrc(image: string | NagiImageSource): string {
  const src = typeof image === 'string' ? image : image.src
  return withBase(src, site.value.base)
}

function resolveAlt(
  image: string | NagiImageSource,
  fallback?: string,
): string {
  if (props.alt !== undefined) {
    return props.alt
  }
  return typeof image === 'object' ? image.alt ?? fallback ?? '' : fallback ?? ''
}
</script>

<template>
  <template v-if="isThemeableImage(image)">
    <img
      v-bind="$attrs"
      class="nagi-themeable-image nagi-themeable-image--light"
      :src="resolveSrc(image.light)"
      :alt="resolveAlt(image.light, image.alt)"
    >
    <img
      v-bind="$attrs"
      class="nagi-themeable-image nagi-themeable-image--dark"
      :src="resolveSrc(image.dark)"
      :alt="resolveAlt(image.dark, image.alt)"
    >
  </template>
  <img
    v-else
    v-bind="$attrs"
    class="nagi-themeable-image"
    :src="resolveSrc(image)"
    :alt="resolveAlt(image)"
  >
</template>
