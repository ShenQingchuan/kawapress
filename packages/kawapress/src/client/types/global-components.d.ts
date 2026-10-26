export {}

declare module 'vue' {
  interface GlobalComponents {
    Layout: import('vue').Component
    KawaOutlet: typeof import('../components/KawaOutlet.vue')['default']
    NotFound: import('vue').Component
  }
}
