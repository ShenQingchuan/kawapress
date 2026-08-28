export const NAGI_SIDEBAR_MIN_WIDTH = 14
export const NAGI_SIDEBAR_DEFAULT_WIDTH = 17
export const NAGI_SIDEBAR_MAX_WIDTH = 17

const SIDEBAR_WIDTH_PROPERTY = '--nagi-sidebar-width'
const SIDEBAR_WIDTH_STORAGE_KEY = 'kawapress:nagi:sidebar-width'

export const sidebarWidthInitializerScript = `(() => {
  try {
    const stored = localStorage.getItem(${JSON.stringify(SIDEBAR_WIDTH_STORAGE_KEY)})
    if (stored === null) return
    const value = Number(stored)
    if (!Number.isFinite(value)) return
    const width = Math.min(${NAGI_SIDEBAR_MAX_WIDTH}, Math.max(${NAGI_SIDEBAR_MIN_WIDTH}, value))
    document.documentElement.style.setProperty(${JSON.stringify(SIDEBAR_WIDTH_PROPERTY)}, width + 'rem')
  }
  catch {}
})()`

export function applyStoredSidebarWidth(): number {
  const stored = readStoredSidebarWidth()
  if (stored === undefined) {
    return NAGI_SIDEBAR_DEFAULT_WIDTH
  }
  return applySidebarWidth(stored)
}

export function applySidebarWidth(width: number): number {
  const resolved = clampSidebarWidth(width)
  document.documentElement.style.setProperty(
    SIDEBAR_WIDTH_PROPERTY,
    `${resolved}rem`,
  )
  return resolved
}

export function persistSidebarWidth(width: number): number {
  const resolved = applySidebarWidth(width)
  try {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(resolved))
  }
  catch {
    // The selected width still applies for the current page.
  }
  return resolved
}

export function resetSidebarWidth(): number {
  document.documentElement.style.removeProperty(SIDEBAR_WIDTH_PROPERTY)
  try {
    window.localStorage.removeItem(SIDEBAR_WIDTH_STORAGE_KEY)
  }
  catch {
    // The default width still applies for the current page.
  }
  return NAGI_SIDEBAR_DEFAULT_WIDTH
}

export function clampSidebarWidth(width: number): number {
  return Math.min(
    NAGI_SIDEBAR_MAX_WIDTH,
    Math.max(NAGI_SIDEBAR_MIN_WIDTH, width),
  )
}

function readStoredSidebarWidth(): number | undefined {
  try {
    const stored = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY)
    if (stored === null) {
      return
    }
    const width = Number(stored)
    return Number.isFinite(width) ? clampSidebarWidth(width) : undefined
  }
  catch {}
}
