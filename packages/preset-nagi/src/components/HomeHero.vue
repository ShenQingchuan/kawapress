<script setup lang="ts">
import type { NagiHomeHero } from '../home'
import { RouterLink } from 'kawapress/client'
import { isExternalLink } from '../home'
import ThemeableImage from './ThemeableImage.vue'

defineProps<{
  hero: NagiHomeHero
}>()
</script>

<template>
  <section class="nagi-home-hero" :class="{ 'has-image': hero.image }">
    <div class="nagi-home-hero__container">
      <div class="nagi-home-hero__main">
        <h1 v-if="hero.name || hero.text" class="nagi-home-hero__heading">
          <span v-if="hero.name" class="nagi-home-hero__name">
            {{ hero.name }}
          </span>
          <span v-if="hero.text" class="nagi-home-hero__text">
            {{ hero.text }}
          </span>
        </h1>
        <p v-if="hero.tagline" class="nagi-home-hero__tagline">
          {{ hero.tagline }}
        </p>

        <div v-if="hero.actions?.length" class="nagi-home-hero__actions">
          <template v-for="action in hero.actions" :key="action.link">
            <a
              v-if="isExternalLink(action.link)"
              :href="action.link"
              class="nagi-home-action"
              :class="`nagi-home-action--${action.theme ?? 'brand'}`"
              :target="action.target ?? '_blank'"
              :rel="action.rel ?? 'noreferrer'"
            >
              {{ action.text }}
            </a>
            <RouterLink
              v-else
              :to="action.link"
              class="nagi-home-action"
              :class="`nagi-home-action--${action.theme ?? 'brand'}`"
            >
              {{ action.text }}
            </RouterLink>
          </template>
        </div>
      </div>

      <div v-if="hero.image" class="nagi-home-hero__image">
        <div class="nagi-home-hero__image-container">
          <div class="nagi-home-hero__image-glow" aria-hidden="true" />
          <ThemeableImage
            class="nagi-home-hero__image-src"
            :image="hero.image"
          />
        </div>
      </div>
    </div>
  </section>
</template>
