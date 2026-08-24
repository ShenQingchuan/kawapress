export type NagiAppearance = 'light' | 'dark'

const STORAGE_KEY = 'kawapress:appearance'

export function applyStoredAppearance(): void {
  try {
    const appearance = window.localStorage.getItem(STORAGE_KEY)
    if (appearance === 'light' || appearance === 'dark') {
      applyAppearance(appearance)
    }
  }
  catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function toggleAppearance(): NagiAppearance {
  const current = resolveAppearance()
  const next = current === 'dark' ? 'light' : 'dark'
  applyAppearance(next)
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  }
  catch {
    // The selected appearance still applies for the current page.
  }
  return next
}

function resolveAppearance(): NagiAppearance {
  const root = document.documentElement
  if (root.classList.contains('dark')) {
    return 'dark'
  }
  if (root.classList.contains('light')) {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyAppearance(appearance: NagiAppearance): void {
  const root = document.documentElement
  root.classList.remove(appearance === 'dark' ? 'light' : 'dark')
  root.classList.add(appearance)
}
