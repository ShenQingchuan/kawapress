export type NagiPageLayout = 'doc' | 'home' | 'page'

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
  frontmatter: Record<string, unknown>,
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
