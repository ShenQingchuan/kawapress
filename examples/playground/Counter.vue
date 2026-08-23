<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button class="counter" @click="count++">
    counter: {{ count }}
  </button>
</template>
