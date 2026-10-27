/** CI mode: publishing through npm trusted publishing from a tagged GitHub Actions run. */

import process from 'node:process'

import { publishWorkflowFile } from './constants.mjs'
import { readReleaseCommits } from './git.mjs'
import { logSuccess } from './runtime.mjs'
import { findReleaseTagProblem } from './semver.mjs'

/**
 * True when npm can mint an OIDC token for this run. GitHub only exposes the token
 * endpoint to jobs that were granted `permissions: id-token: write`.
 */
export function isOidcPublishingAvailable(env = process.env) {
  return Boolean(env.ACTIONS_ID_TOKEN_REQUEST_URL?.trim())
}

/**
 * Pure check set for a tagged CI release. Returns human-readable problems;
 * an empty array means the checkout really is the tagged release commit.
 */
export function findCiEnvironmentProblems({ env, headCommit, tagCommit }) {
  const problems = []
  const tagName = env.GITHUB_REF_NAME

  if (env.GITHUB_ACTIONS !== 'true') {
    problems.push(
      'ACTIONS_ID_TOKEN_REQUEST_URL is set but GITHUB_ACTIONS is not "true"; refusing to treat this as a GitHub Actions release.',
    )
  }

  if (env.GITHUB_REF_TYPE !== 'tag') {
    problems.push(
      `The release workflow must run for a tag, but it ran for ${env.GITHUB_REF_TYPE || '(unknown)'} ${tagName || ''}. Push a v* tag to release.`,
    )
  }
  else {
    const tagProblem = findReleaseTagProblem(tagName)
    if (tagProblem)
      problems.push(tagProblem)

    if (!tagCommit) {
      problems.push(
        `Tag ${tagName} is not in this checkout. Fetch full history and tags (actions/checkout with fetch-depth: 0).`,
      )
    }
    else if (tagCommit !== headCommit) {
      problems.push(`Tag ${tagName} points at ${tagCommit}, but HEAD is ${headCommit}. Tags must be created on the release commit.`)
    }
  }

  if (env.GITHUB_SHA && headCommit !== env.GITHUB_SHA) {
    problems.push(
      `HEAD is ${headCommit} but the workflow ran for ${env.GITHUB_SHA}. Check out the tagged commit (actions/checkout ref: \${{ github.ref }}).`,
    )
  }

  return problems
}

/** Fails unless this run is the tagged release commit, resolved by Git and by GitHub. */
export async function checkCiReleaseEnvironment({ env = process.env } = {}) {
  const tagName = env.GITHUB_REF_NAME ?? ''
  const { headCommit, tagCommit } = await readReleaseCommits(tagName)
  const problems = findCiEnvironmentProblems({ env, headCommit, tagCommit })

  if (problems.length > 0) {
    throw new Error([
      `Refusing to publish from this run:`,
      ...problems.map(problem => `- ${problem}`),
    ].join('\n'))
  }

  logSuccess(`CI preflight: ${tagName} is checked out at ${headCommit.slice(0, 7)}`)
}

/** In CI a partial publish is unrecoverable, so every package must already exist on npm. */
export function formatMissingPackagesError(missing) {
  return [
    `These packages do not exist on npm yet: ${missing.join(', ')}`,
    '',
    'npm trusted publishing can only be configured for a package that already exists,',
    `and ${publishWorkflowFile} publishes all packages in one run, so they must be bootstrapped first.`,
    '',
    'Run this once, locally, from a clean main:',
    '  npm login',
    '  pnpm release --version 0.0.1 --bootstrap',
    '',
    'Then configure the trusted publisher for every package; see RELEASING.md.',
  ].join('\n')
}
