/** Interactive npm login checks, used by local publish and bootstrap runs only. */

import { logSuccess, run } from './runtime.mjs'

/**
 * Local publish path: CI never calls this. npm trusted publishing replaces the token,
 * so the `npm whoami` / owner / org checks only make sense with a logged-in maintainer.
 */
export async function checkAuthentication(registry) {
  const result = await run('npm', ['whoami', `--registry=${registry}`], {
    allowFailure: true,
    capture: true,
  })
  if (result.exitCode !== 0) {
    throw new Error(
      `npm authentication is missing for ${registry}\nRun: npm login --registry=${registry}`,
    )
  }

  const username = result.stdout.trim()
  if (!username)
    throw new Error('npm whoami returned an empty username.')

  const ownerResult = await run('npm', [
    'owner',
    'ls',
    'kawapress',
    `--registry=${registry}`,
  ], { allowFailure: true, capture: true })
  if (ownerResult.exitCode !== 0 || !ownerResult.stdout.split(/\s+/).includes(username)) {
    throw new Error(`npm user ${username} is not listed as an owner of kawapress.`)
  }

  const orgResult = await run('npm', [
    'org',
    'ls',
    'kawapress',
    '--json',
    `--registry=${registry}`,
  ], { allowFailure: true, capture: true })
  if (orgResult.exitCode !== 0)
    throw new Error(`Could not verify @kawapress organization membership for ${username}.`)

  const organization = JSON.parse(orgResult.stdout || '{}')
  const members = Array.isArray(organization)
    ? organization
    : Object.keys(organization)
  if (!members.includes(username))
    throw new Error(`npm user ${username} is not a member of the @kawapress organization.`)

  logSuccess(`npm authentication: ${username}`)
}
