/** Directory created when the user does not name one. */
export const DEFAULT_PROJECT_DIRECTORY = 'kawapress-site'

/**
 * Turns a directory name into a readable site title:
 * `my-kawapress-site` becomes `My Kawapress Site`.
 */
export function formatProjectTitle(directoryName: string): string {
  const words = directoryName.split(/[\s._-]+/).filter(Boolean)
  if (words.length === 0)
    return 'KawaPress Site'

  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Turns a directory name into a safe package name. The generated `package.json`
 * is always private, but editors and tooling still expect the usual lowercase
 * letters, digits, dots, dashes and underscores.
 */
export function toProjectName(directoryName: string): string {
  const name = directoryName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-._]+/, '')
    .replace(/[-._]+$/, '')

  return name.length > 0 ? name : DEFAULT_PROJECT_DIRECTORY
}
