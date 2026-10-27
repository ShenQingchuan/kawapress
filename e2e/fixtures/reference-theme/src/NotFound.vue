<script setup lang="ts">
import { useSite } from 'kawapress/client'

const site = useSite()
</script>

<template>
  <div class="ref-notfound">
    <h1>404</h1>
    <p>This page does not exist.</p>
    <a :href="site.link">Back to the home page</a>
  </div>
</template>
