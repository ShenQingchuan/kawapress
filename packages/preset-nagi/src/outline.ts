import type { PageHeader } from 'kawapress'

export interface OutlineHeaderPosition {
  link: string
  top: number
}

export function getOutlineHeaders(headers: PageHeader[]): PageHeader[] {
  return headers.flatMap((header) => {
    if (header.level === 1) {
      return header.children
    }
    return header
  })
}

export function flattenOutlineHeaders(headers: PageHeader[]): PageHeader[] {
  return headers.flatMap(header => [
    header,
    ...flattenOutlineHeaders(header.children),
  ])
}

export function findOutlineHeaderByHash(
  headers: PageHeader[],
  hash: string,
): PageHeader | undefined {
  const normalizedHash = normalizeHash(hash.split(':~:')[0] ?? '')
  return flattenOutlineHeaders(headers).find(
    header => normalizeHash(header.link) === normalizedHash,
  )
}

export function resolveDisplayedOutlineLink(
  headers: PageHeader[],
  activeLink: string | null,
): string | null {
  const flattened = flattenOutlineHeaders(headers)
  if (activeLink && flattened.some(header => header.link === activeLink)) {
    return activeLink
  }
  return flattened[0]?.link ?? null
}

function normalizeHash(hash: string): string {
  try {
    return decodeURIComponent(hash)
  }
  catch {
    return hash
  }
}

export function resolveActiveOutlineLink(
  headers: readonly OutlineHeaderPosition[],
  scrollTop: number,
  viewportHeight: number,
  scrollHeight: number,
  offset = 8,
): string | null {
  if (headers.length === 0) {
    return null
  }

  if (scrollTop + viewportHeight >= scrollHeight - 2) {
    return headers[headers.length - 1]!.link
  }

  let active = headers[0]!.link
  for (const header of headers) {
    if (header.top <= scrollTop + offset) {
      active = header.link
      continue
    }
    break
  }
  return active
}
