/**
 * Frontmatter keys this plugin reads. Every reader of `PageFrontmatter` sees
 * them while the plugin is imported.
 */
declare module 'kawapress' {
  interface PageFrontmatter {
    /** `false` leaves this page out of `sitemap.xml`. */
    sitemap?: boolean
  }
}

export {}
