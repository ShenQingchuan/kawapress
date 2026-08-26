export {}

declare module 'vue' {
  interface GlobalComponents {
    Layout: import('vue').Component
    NotFound: import('vue').Component
  }
}
