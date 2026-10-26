/// <reference types="vite/client" />

declare module 'virtual:kawapress-pages' {
  export const pageManifest: import('../../core/page-manifest').PageManifest
}

declare module 'virtual:kawapress-site' {
  export const site: import('../../core/site').SiteData
}

declare module 'virtual:kawapress-runtime-plugins' {
  export const runtimePlugins: import('../../api/plugin').RuntimePlugin[]
}
