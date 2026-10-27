#!/usr/bin/env node
// @env node

/**
 * Makes sure the repository has its full history before the docs are built.
 *
 * The docs show the last commit time of each page, and git can only report it
 * when the history is complete. Some hosts clone with `--depth 1` (Cloudflare
 * Pages does), which makes the plugin skip the time on purpose. Fetching the
 * rest of the history here fixes that without changing the host settings. A
 * repository that is already complete, or a checkout without a remote, is left
 * alone, and a failed fetch only warns: the docs still build, without dates.
 */

import { execFileSync } from 'node:child_process'
import process from 'node:process'

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

try {
  if (git(['rev-parse', '--is-shallow-repository']) !== 'true')
    process.exit(0)

  console.log('git history: shallow clone detected, fetching the full history…')
  git(['fetch', '--unshallow', '--quiet'])

  // `git fetch` can succeed without deepening anything, for example when there is
  // no remote, so the result is checked instead of assumed.
  if (git(['rev-parse', '--is-shallow-repository']) === 'true')
    throw new Error('the repository is still shallow after the fetch')
  console.log('git history: full history fetched.')
}
catch (error) {
  const reason = String(error.stderr || error.message).trim().split('\n')[0]
  console.warn(`git history: could not fetch the full history (${reason}). Last updated times will be skipped.`)
}
