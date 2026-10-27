import type { PageFrontmatter } from 'kawapress'
import type { NagiHomeFeature, NagiHomeHero } from './home'

export type NagiPageLayout = 'doc' | 'home' | 'page'

/**
 * Frontmatter keys nagi reads. Every reader of `PageFrontmatter` sees them
 * while nagi is imported. A value of another type is not an error: nagi falls
 * back to its default, so these types describe what authors should write.
 */
declare module 'kawapress' {
  interface PageFrontmatter {
    /** `doc` (default), `home` for a landing page, or `page` for a plain page. */
    layout?: NagiPageLayout
    /** `false` hides the navigation bar of this page. */
    navbar?: boolean
    /** `false` hides the sidebar of this page. */
    sidebar?: boolean
    /** `false` hides the outline column on wide screens. */
    aside?: boolean
    /** `false` turns every outline off for this page. */
    outline?: boolean
    /** `false` hides the footer of `home` and `page` layouts. */
    footer?: boolean
    /** CSS class added to the page shell. */
    pageClass?: string
    /** Hero block of a `home` page. */
    hero?: NagiHomeHero
    /** Feature cards of a `home` page. */
    features?: NagiHomeFeature[]
  }
}

export interface NagiPageOptions {
  layout: NagiPageLayout
  navbar: boolean
  sidebar: boolean
  aside: boolean
  outline: boolean
  footer: boolean
  pageClass?: string
}

export function resolveNagiPageOptions(
  frontmatter: PageFrontmatter,
): NagiPageOptions {
  return {
    layout: resolveLayout(frontmatter.layout),
    navbar: frontmatter.navbar !== false,
    sidebar: frontmatter.sidebar !== false,
    aside: frontmatter.aside !== false,
    outline: frontmatter.outline !== false,
    footer: frontmatter.footer !== false,
    ...(typeof frontmatter.pageClass === 'string'
      ? { pageClass: frontmatter.pageClass }
      : {}),
  }
}

function resolveLayout(value: unknown): NagiPageLayout {
  return value === 'home' || value === 'page' ? value : 'doc'
}
