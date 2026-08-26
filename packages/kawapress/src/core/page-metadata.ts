import type { PageHeader } from './site'

export interface PageMetadata {
  title: string
  description?: string
  titleTemplate?: string | false
}

export function resolvePageMetadata(
  frontmatter: Record<string, unknown>,
  headers: ReadonlyArray<Pick<PageHeader, 'level' | 'title'>>,
): PageMetadata {
  const title = typeof frontmatter.title === 'string'
    ? frontmatter.title
    : headers.find(header => header.level === 1)?.title ?? ''
  const description = typeof frontmatter.description === 'string'
    ? frontmatter.description
    : undefined
  const titleTemplate = typeof frontmatter.titleTemplate === 'string'
    || frontmatter.titleTemplate === false
    ? frontmatter.titleTemplate
    : undefined

  return {
    title,
    ...(description === undefined ? {} : { description }),
    ...(titleTemplate === undefined ? {} : { titleTemplate }),
  }
}

export function resolveDocumentTitle(
  metadata: PageMetadata,
  siteTitle: string,
): string {
  if (!metadata.title) {
    return siteTitle
  }
  if (metadata.titleTemplate === false) {
    return metadata.title
  }
  if (typeof metadata.titleTemplate === 'string') {
    return metadata.titleTemplate.replaceAll('%s', metadata.title)
  }
  return metadata.title === siteTitle
    ? siteTitle
    : `${metadata.title} | ${siteTitle}`
}
