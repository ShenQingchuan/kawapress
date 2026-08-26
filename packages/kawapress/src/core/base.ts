const EXTERNAL_URL_RE = /^(?:[a-z][a-z\d+.-]*:)?\/\//i

export function normalizeBase(base = '/'): string {
  if (!base.startsWith('/')) {
    throw new Error(
      `KawaPress: base must start with "/", got ${JSON.stringify(base)}.`,
    )
  }

  const normalized = `/${base.split('/').filter(Boolean).join('/')}`
  return normalized === '/' ? '/' : `${normalized}/`
}

export function withBase(path: string, base: string): string {
  if (EXTERNAL_URL_RE.test(path) || path.startsWith('#')) {
    return path
  }

  const normalizedBase = normalizeBase(base)
  if (normalizedBase === '/') {
    return path.startsWith('/') ? path : `/${path}`
  }

  const baseWithoutSlash = normalizedBase.slice(0, -1)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseWithoutSlash}${normalizedPath}`
}

export function decodeUrlPathname(pathname: string): string {
  try {
    return decodeURI(pathname)
  }
  catch {
    return pathname
  }
}

export function withoutBase(path: string, base: string): string | undefined {
  const normalizedBase = normalizeBase(base)
  if (normalizedBase === '/') {
    return path
  }

  const baseWithoutSlash = normalizedBase.slice(0, -1)
  if (path === baseWithoutSlash || path === normalizedBase) {
    return '/'
  }
  if (path.startsWith(normalizedBase)) {
    return `/${path.slice(normalizedBase.length)}`
  }
}
