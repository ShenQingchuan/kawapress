import type { PageHeader } from 'kawapress'

export function getOutlineHeaders(headers: PageHeader[]): PageHeader[] {
  return headers.flatMap((header) => {
    if (header.level === 1) {
      return header.children
    }
    return header
  })
}
