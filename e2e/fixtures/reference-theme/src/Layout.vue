<script setup lang="ts">
import { RouterView, useSite, withBase } from 'kawapress/client'

const site = useSite()
</script>

<template>
  <div class="ref-shell">
    <header class="ref-header">
      <a class="ref-title" :href="site.link">{{ site.title }}</a>
      <nav class="ref-nav">
        <a :href="site.link">Home</a>
        <a :href="withBase('/second', site.base)">Second page</a>
      </nav>
      <div class="ref-actions">
        <KawaOutlet name="layout.header.end" />
      </div>
    </header>

    <main class="ref-doc">
      <KawaOutlet name="doc">
        <RouterView />
      </KawaOutlet>
    </main>
  </div>
</template>
