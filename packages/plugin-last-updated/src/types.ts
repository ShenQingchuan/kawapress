/** User-visible strings of the last updated footer. */
export interface LastUpdatedLabels {
  /** Text before the date, for example `Last updated`. */
  lastUpdated: string
  /** Text of the edit link. */
  editLink: string
}

export interface LastUpdatedEditLinkOptions {
  /**
   * URL template of the page source on the repository host. `:path` is replaced
   * by the source path inside the repository, without a leading slash.
   */
  pattern: string
  /** Link text for every locale. `labels` and `localeLabels` win over it. */
  text?: string
}

export interface LastUpdatedDateOptions {
  /** Formatting passed to `Intl.DateTimeFormat`; defaults to a medium date and a short time. */
  formatOptions?: Intl.DateTimeFormatOptions
}

export interface LastUpdatedPluginOptions {
  lastUpdated?: LastUpdatedDateOptions
  editLink?: LastUpdatedEditLinkOptions
  /** Override the built-in strings for every locale. */
  labels?: Partial<LastUpdatedLabels>
  /** Override the built-in strings for one KawaPress locale key. */
  localeLabels?: Record<string, Partial<LastUpdatedLabels>>
}

/** Options the runtime component receives as JSON through a virtual module. */
export interface LastUpdatedRuntimeOptions {
  formatOptions?: Intl.DateTimeFormatOptions
  labels?: Partial<LastUpdatedLabels>
  localeLabels?: Record<string, Partial<LastUpdatedLabels>>
}

/**
 * Fields this plugin adds to the page data and to the frontmatter. Every
 * reader sees them as soon as the plugin is imported, so a custom component can
 * read `usePageData().value?.lastUpdated` without a cast.
 */
declare module 'kawapress' {
  interface PageData {
    /** Last commit time of the Markdown source file, in milliseconds since the epoch. */
    lastUpdated?: number
    /** Absolute URL of the page source on the repository host. */
    editLink?: string
  }

  interface PageFrontmatter {
    /** `false` hides the last updated time of this page. */
    lastUpdated?: boolean | string
    /** `false` hides the edit link of this page. */
    editLink?: boolean
  }
}
