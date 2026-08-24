export interface SearchTextPart {
  text: string
  highlighted: boolean
}

export function highlightSearchText(
  text: string,
  query: string,
): SearchTextPart[] {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  if (terms.length === 0) {
    return [{ text, highlighted: false }]
  }

  const source = terms
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join('|')
  const splitPattern = new RegExp(`(${source})`, 'giu')
  const highlightPattern = new RegExp(`^(?:${source})$`, 'iu')
  return text.split(splitPattern).filter(Boolean).map(part => ({
    text: part,
    highlighted: highlightPattern.test(part),
  }))
}

export function createSearchExcerpt(
  text: string,
  query: string,
  maxLength = 180,
): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }

  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const lowerText = normalized.toLocaleLowerCase()
  const matchIndex = terms
    .map(term => lowerText.indexOf(term))
    .filter(index => index >= 0)
    .sort((left, right) => left - right)[0] ?? 0
  const start = Math.max(0, Math.min(
    matchIndex - Math.floor(maxLength / 3),
    normalized.length - maxLength,
  ))
  const excerpt = normalized.slice(start, start + maxLength).trim()
  return `${start > 0 ? '…' : ''}${excerpt}${start + maxLength < normalized.length ? '…' : ''}`
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
