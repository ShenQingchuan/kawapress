/** Appearance of the site, mirrored from the theme for the comment widget. */
export type CommentsAppearance = 'light' | 'dark'

export interface CommentsThreadContext {
  /** Appearance at the moment the thread is created. */
  appearance: CommentsAppearance
  /** Interface language of the widget, for example `zh-CN` or `en`. */
  lang: string
}

/** One mounted comment thread. */
export interface CommentsThread {
  /** Follows a new site appearance without reloading the widget. */
  setAppearance: (appearance: CommentsAppearance) => void
  /** Removes every element the widget added. */
  destroy: () => void
}

/**
 * A comment backend. The component owns lazy loading, page and appearance
 * tracking; a provider only knows how to put its widget into a container.
 */
export interface CommentsProvider {
  create: (
    container: HTMLElement,
    context: CommentsThreadContext,
  ) => CommentsThread
}
