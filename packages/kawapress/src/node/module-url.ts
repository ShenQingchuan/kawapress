import { normalizePath } from 'vite'

/** Absolute fs path -> vite module url. Windows: C:\a\b -> /@fs/C:/a/b */
export function toFsModuleUrl(absPath: string): string {
  const normalized = normalizePath(absPath)
  return normalized.startsWith('/') ? `/@fs${normalized}` : `/@fs/${normalized}`
}
