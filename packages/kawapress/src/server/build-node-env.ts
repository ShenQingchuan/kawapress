import { consola } from 'consola'

/** `NODE_ENV` a build can ship: the only value Vite inlines as a production build. */
export const BUILD_NODE_ENV = 'production'

/** Minimal shape of the environment object the build pins, so tests can inject one. */
export type NodeEnv = Record<string, string | undefined>

export interface BuildNodeEnvChange {
  /** `NODE_ENV` the caller had before the build pinned it; `undefined` when unset. */
  previous: string | undefined
  /** Whether {@link previous} was overwritten by {@link BUILD_NODE_ENV}. */
  replaced: boolean
}

/**
 * Pins `env.NODE_ENV` to "production" and reports what that replaced.
 *
 * The value of `NODE_ENV` at build time is baked into every shipped chunk, because
 * Vite replaces `process.env.NODE_ENV` with the literal string and Vue, vue-router
 * and devtools branch on it. The build therefore has to own this variable before
 * anything resolves a Vite config: loading the site config goes through
 * `runnerImport()`, which resolves a serve-like config first and defaults
 * `NODE_ENV` to "development", so a later fix-up would already be too late.
 *
 * The build always wins over an inherited value, the same way VitePress forces
 * "production" in its `build` command: a development bundle is never a valid
 * output of a build, and a stray exported `NODE_ENV=development` (shell profiles
 * and test runners export it) would otherwise silently ship the dev build of Vue
 * plus devtools. Debugging a development build is what `kawapress dev` is for.
 */
export function ensureProductionNodeEnv(env: NodeEnv): BuildNodeEnvChange {
  const previous = env.NODE_ENV
  env.NODE_ENV = BUILD_NODE_ENV
  return { previous, replaced: previous !== BUILD_NODE_ENV }
}

/** Tells the user their `NODE_ENV` did not apply, so a surprising build is explainable. */
export function warnAboutReplacedNodeEnv(change: BuildNodeEnvChange): void {
  if (!change.replaced || change.previous === undefined) {
    return
  }
  consola.warn(
    `KawaPress: ignoring NODE_ENV=${change.previous} for this build. `
    + `"kawapress build" always builds for production; run "kawapress dev" `
    + `if you need a development build.`,
  )
}
