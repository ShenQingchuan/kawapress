export function normalizeFrontmatterSource(source: string): string {
  const offset = source.startsWith('\uFEFF') ? 1 : 0
  if (source[offset] !== '{') {
    return source
  }

  const end = findJsonObjectEnd(source, offset)
  if (end === undefined) {
    throw new Error('KawaPress: JSON frontmatter must be a complete JSON object.')
  }
  if (end < source.length && source[end] !== '\n' && source[end] !== '\r') {
    return source
  }

  const json = source.slice(offset, end)
  let frontmatter: unknown
  try {
    frontmatter = JSON.parse(json)
  }
  catch {
    throw new Error('KawaPress: JSON frontmatter must contain valid JSON.')
  }
  if (!isRecord(frontmatter)) {
    throw new Error('KawaPress: JSON frontmatter must be an object.')
  }

  return `${source.slice(0, offset)}---\n${json}\n---${source.slice(end)}`
}

function findJsonObjectEnd(source: string, start: number): number | undefined {
  let depth = 0
  let quote: '"' | '\'' | undefined
  let escaped = false

  for (let index = start; index < source.length; index++) {
    const character = source[index]
    if (quote) {
      if (escaped) {
        escaped = false
      }
      else if (character === '\\') {
        escaped = true
      }
      else if (character === quote) {
        quote = undefined
      }
      continue
    }
    if (character === '"' || character === '\'') {
      quote = character
    }
    else if (character === '{') {
      depth++
    }
    else if (character === '}') {
      depth--
      if (depth === 0) {
        return index + 1
      }
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
