/**
 * Node.js helpers for Generator Plugins. They run only on the generator side;
 * never import this entry from a Runtime Plugin.
 */
export { parseGitLog, readGitLastUpdated } from './generator/git'
export type { ReadGitLastUpdatedOptions } from './generator/git'
export { useRuntimeDependencies } from './generator/runtime-dependencies'
