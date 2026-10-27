/**
 * Frontmatter keys this plugin reads. Every reader of `PageFrontmatter` sees
 * them while the plugin is imported.
 */
declare module 'kawapress' {
  interface PageFrontmatter {
    /** `false` turns image zoom off for every image of this page. */
    imageZoom?: boolean
  }
}

export {}
