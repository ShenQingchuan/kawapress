/// <reference types="vite/client" />

declare module 'virtual:kawapress-pages' {
  export const pages: import('../../core/page-manifest').PageTable
  /** Route path → module id of the page, read by prerendering to find its chunk. */
  export const pageModules: Record<string, string>
}

declare module 'virtual:kawapress-site' {
  export const site: import('../../core/site').SiteData
}

declare module 'virtual:kawapress-runtime-plugins' {
  export const runtimePlugins: import('../../api/plugin').RuntimePlugin[]
}
