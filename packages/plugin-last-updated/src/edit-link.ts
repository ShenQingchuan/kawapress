import { isAbsolute, relative, sep } from 'node:path'

/** Placeholder of `editLink.pattern` that stands for the source path. */
export const EDIT_LINK_PATH_PLACEHOLDER = ':path'

const EXAMPLE_PATTERN = 'https://github.com/user/repo/edit/main/:path'

/** Rejects a pattern that cannot place the source path, naming the option to fix. */
export function validateEditLinkPattern(pattern: string): string {
  if (typeof pattern !== 'string' || !pattern.includes(EDIT_LINK_PATH_PLACEHOLDER)) {
    throw new TypeError(
      `KawaPress Last Updated: \`editLink.pattern\` must contain ${JSON.stringify(EDIT_LINK_PATH_PLACEHOLDER)} so the page source can be placed in it, for example ${JSON.stringify(EXAMPLE_PATTERN)}. Received ${JSON.stringify(pattern)}.`,
    )
  }
  return pattern
}

/**
 * Path of `file` inside the repository, written with forward slashes like git
 * does, or `undefined` when the file lives outside the repository.
 */
export function toRepositoryPath(
  file: string,
  repositoryRoot: string,
): string | undefined {
  const path = relative(repositoryRoot, file)
  if (!path || isAbsolute(path) || path === '..' || path.startsWith(`..${sep}`)) {
    return undefined
  }
  return path.split(sep).map(encodeURIComponent).join('/')
}

/** Fills `pattern` with a repository path, for example `docs/guide/intro.md`. */
export function createEditLink(pattern: string, repositoryPath: string): string {
  return pattern.split(EDIT_LINK_PATH_PLACEHOLDER).join(repositoryPath)
}
