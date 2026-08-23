<script setup lang="ts">
import { RouterView, useHead, usePage, useSite } from 'kawapress/client'
import { computed } from 'vue'

const site = useSite()
const page = usePage()

useHead({
  title: computed(() => page.value?.title ? `${page.value.title} | ${site.title}` : site.title),
})
</script>

<template>
  <div class="nagi">
    <NavBar />
    <main class="nagi-main">
      <RouterView />
    </main>
    <Footer />
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.7;
}

.nagi {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.nagi-main {
  flex: 1;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}
</style>
