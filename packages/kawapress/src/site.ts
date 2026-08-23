export interface SiteConfig {
  title?: string
  srcDir?: string
}

/** Site data exposed to the client via virtual module */
export interface SiteData {
  title: string
}

export interface PageHeader {
  level: number
  title: string
  slug: string
  link: string
  children: PageHeader[]
}

export interface PageData {
  path: string
  title: string
  frontmatter: Record<string, unknown>
  headers: PageHeader[]
}
