/**
 * Node.js helpers for Generator Plugins. They run only on the generator side;
 * never import this entry from a Runtime Plugin.
 */
export { createPageSummaryReader } from './compiler/page-summary'
export type { PageSummaryReader } from './compiler/page-summary'
export type { PageSummary } from './core/page-manifest'
export { parseGitLog, readGitLastUpdated } from './generator/git'
export type { ReadGitLastUpdatedOptions } from './generator/git'
export { isMarkdownPage, listMarkdownPages, markdownFileToRoutePath } from './generator/pages'
export type { MarkdownPage, MarkdownPageScope } from './generator/pages'
export { useRuntimeDependencies } from './generator/runtime-dependencies'
