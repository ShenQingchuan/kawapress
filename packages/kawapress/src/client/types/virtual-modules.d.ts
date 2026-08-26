/// <reference types="vite/client" />

declare module 'virtual:kawapress-pages' {
  export const pages: Record<string, () => Promise<{
    default: import('vue').Component
    __pageData?: import('../../core/site').PageData
  }>>
  export const pageData: Record<string, import('../../core/site').PageData>
}

declare module 'virtual:kawapress-site' {
  export const site: import('../../core/site').SiteData
}

declare module 'virtual:kawapress-runtime-plugins' {
  export const runtimePlugins: import('../../api/plugin').RuntimePlugin[]
}
