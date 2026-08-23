/// <reference types="vite/client" />

declare module 'virtual:kawapress-pages' {
  export const pages: Record<string, () => Promise<{
    default: import('vue').Component
    __pageData?: import('../site').PageData
  }>>
}

declare module 'virtual:kawapress-site' {
  export const site: import('../site').SiteData
}

declare module 'virtual:kawapress-runtime-plugins' {
  export const runtimePlugins: import('../plugin-api').RuntimePlugin[]
}
