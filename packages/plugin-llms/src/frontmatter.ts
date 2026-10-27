/**
 * Frontmatter keys this plugin reads. Every reader of `PageFrontmatter` sees
 * them while the plugin is imported.
 */
declare module 'kawapress' {
  interface PageFrontmatter {
    /** `false` leaves this page out of `.md`, `llms.txt` and `llms-full.txt`. */
    llms?: boolean
    /** Description used in `llms.txt` instead of the page description. */
    llmsTxt?: string
    /** Position of this page in `llms.txt`; lower numbers come first. */
    order?: number
  }
}

export {}
