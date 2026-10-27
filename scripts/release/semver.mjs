/** Semver parsing, comparison, range checks, and Git tag naming for releases. */

import { semverPattern } from './constants.mjs'

/** Names that become the npm dist-tag of a prerelease (e.g. `1.0.0-beta.1` → `beta`). */
const prereleaseTags = /^(?:alpha|beta|bootstrap|canary|dev|next|rc)$/i

export function parseSemver(version) {
  const match = semverPattern.exec(version)
  if (!match)
    throw new Error(`Invalid semantic version: ${version}`)

  const prerelease = match[4]?.split('.') ?? []
  for (const identifier of prerelease) {
    if (/^\d+$/.test(identifier) && identifier.length > 1 && identifier.startsWith('0'))
      throw new Error(`Invalid numeric prerelease identifier in ${version}: ${identifier}`)
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease,
    raw: version,
  }
}

export function compareSemver(left, right) {
  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key])
      return left[key] < right[key] ? -1 : 1
  }

  if (left.prerelease.length === 0 && right.prerelease.length === 0)
    return 0
  if (left.prerelease.length === 0)
    return 1
  if (right.prerelease.length === 0)
    return -1

  const length = Math.max(left.prerelease.length, right.prerelease.length)
  for (let index = 0; index < length; index += 1) {
    const leftIdentifier = left.prerelease[index]
    const rightIdentifier = right.prerelease[index]

    if (leftIdentifier === undefined)
      return -1
    if (rightIdentifier === undefined)
      return 1
    if (leftIdentifier === rightIdentifier)
      continue

    const leftIsNumber = /^\d+$/.test(leftIdentifier)
    const rightIsNumber = /^\d+$/.test(rightIdentifier)
    if (leftIsNumber && rightIsNumber)
      return Number(leftIdentifier) < Number(rightIdentifier) ? -1 : 1
    if (leftIsNumber)
      return -1
    if (rightIsNumber)
      return 1
    return leftIdentifier < rightIdentifier ? -1 : 1
  }

  return 0
}

export function defaultTag(version) {
  const { prerelease } = parseSemver(version)
  if (prerelease.length === 0)
    return 'latest'

  const candidate = prerelease.find(identifier => /[A-Z]/i.test(identifier))
  return candidate && prereleaseTags.test(candidate)
    ? candidate.toLowerCase()
    : 'next'
}

export function validateTag(tag) {
  if (!/^[A-Z0-9][\w.-]*$/i.test(tag) || semverPattern.test(tag))
    throw new Error(`Invalid npm dist-tag: ${tag}`)
}

/**
 * The Git tag only starts the release workflow; it does not name a version.
 * Returns a problem description, or null for a tag the workflow accepts.
 */
export function findReleaseTagProblem(tagName) {
  if (!tagName?.startsWith('v') || tagName.length === 1)
    return `Release tags must start with "v" (for example v0.3.0), got ${tagName || '(empty)'}.`
  return null
}
