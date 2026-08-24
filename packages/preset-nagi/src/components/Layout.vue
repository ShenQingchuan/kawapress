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
.nagi {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.nagi-main {
  box-sizing: border-box;
  flex: 1;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.nagi-main pre.shiki {
  box-sizing: border-box;
  width: 100%;
  margin: 1rem 0;
  padding: var(--nagi-code-block-padding);
  overflow-x: auto;
  border-radius: var(--nagi-code-block-radius);
}

.nagi-main pre.shiki > code {
  display: block;
  min-width: 100%;
  font-size: var(--nagi-code-font-size);
  line-height: var(--nagi-code-line-height);
}
</style>
