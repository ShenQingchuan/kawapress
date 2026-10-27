/**
 * Frontmatter keys this plugin reads. Every reader of `PageFrontmatter` sees
 * them while the plugin is imported.
 */
declare module 'kawapress' {
  interface PageFrontmatter {
    /** `false` keeps this page out of the search index. */
    search?: boolean
  }
}

export {}
