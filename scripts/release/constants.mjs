/** Values shared by every release module. */

import { fileURLToPath } from 'node:url'

/** Repository root, resolved from this file's location. */
export const rootDir = fileURLToPath(new URL('../..', import.meta.url))

export const defaultRegistry = 'https://registry.npmjs.org/'

export const publishedDependencyFields = [
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
]
export const manifestDependencyFields = [
  ...publishedDependencyFields,
  'devDependencies',
]

/**
 * The package READMEs. The Chinese one is `README-zh-CN.md`, not `README.zh-CN.md`: npm shows
 * the first file that matches `README.*` on the package page, and the dotted name would
 * win over `README.md` and put the Chinese text on the page.
 */
export const readmeFiles = ['README.md', 'README-zh-CN.md']

/** The repository README that stands in for each package README that a package lacks. */
export const repoReadmeFor = {
  'README.md': 'README.md',
  'README-zh-CN.md': 'README.zh-CN.md',
}

/** Unscoped public packages. Scoped packages are matched by the @kawapress/ prefix. */
export const unscopedPackageNames = new Set(['kawapress', 'create-kawapress'])

export const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Z-]+(?:\.[0-9A-Z-]+)*))?$/i
export const testFilePattern = /(?:^|\/)(?:__tests__|tests?)(?:\/|$)|\.(?:spec|test)\.[cm]?[jt]sx?$|\.snap$/i
export const sensitiveFilePattern = /(?:^|\/)(?:\.env(?:\..*)?|\.npmrc|id_rsa|id_ed25519)$|\.(?:key|pem|p12)$/i

/** Trusted publishing needs an OIDC-aware npm CLI (Node 22.14+ ships one, older runners do not). */
export const minNpmVersionForTrustedPublishing = '11.5.1'

/** GitHub Actions workflow that publishes, as npm's trusted publisher config expects it. */
export const publishWorkflowFile = 'release.yml'
export const publishRepository = 'kawapress/kawapress'
export const publishEnvironment = 'npm'
