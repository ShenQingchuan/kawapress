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
      <!-- Scoped slot: the theme wraps the outlet items in its own element. -->
      <KawaOutlet v-slot="{ items }" name="header.actions">
        <div class="ref-actions">
          <component :is="item.component" v-for="item in items" :key="item.id" />
        </div>
      </KawaOutlet>
    </header>

    <main class="ref-doc">
      <RouterView />
      <div class="ref-doc-footer">
        <KawaOutlet name="doc.footer" />
      </div>
      <div class="ref-doc-after">
        <KawaOutlet name="doc.after" />
      </div>
    </main>
  </div>
</template>
