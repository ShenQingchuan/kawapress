import type { HeadConfig } from './head'
import type { PageHeader } from './site'

/**
 * The types a plugin or a theme extends with `declare module 'kawapress'`.
 *
 * They are defined here and exported from the main entry with `export *`.
 * Everything inside KawaPress imports them from this file, so the fields that
 * packages add are the fields that every reader sees.
 */

/**
 * Theme configuration of a site. The interface is empty on purpose: a theme or
 * a plugin adds the fields it understands from its own package, and every
 * package that is imported contributes to the same type.
 *
 * ```ts
 * declare module 'kawapress' {
 *   interface ThemeConfig {
 *     githubUrl?: string
 *   }
 * }
 * ```
 *
 * A field only exists in the type while the package that declares it is part of
 * the program, so give every field an optional type: the site may not use it.
 */

export interface ThemeConfig {}

/**
 * Frontmatter of a page. KawaPress keeps the data open, so any key an author
 * writes is allowed and typed `unknown`. A plugin that reads a key declares it
 * from its own package, which gives every reader the exact type:
 *
 * ```ts
 * declare module 'kawapress' {
 *   interface PageFrontmatter {
 *     comments?: boolean
 *   }
 * }
 * ```
 *
 * The keys are optional because the value comes from the author. Check it at
 * runtime before trusting it.
 */
export interface PageFrontmatter {
  title?: string
  description?: string
  titleTemplate?: string | false
  head?: HeadConfig[]
  [key: string]: unknown
}

export interface PageData {
  path: string
  title: string
  description?: string
  titleTemplate?: string | false
  /** `<head>` tags from frontmatter, rendered after site and locale tags. */
  head?: HeadConfig[]
  frontmatter: PageFrontmatter
  headers: PageHeader[]
}
