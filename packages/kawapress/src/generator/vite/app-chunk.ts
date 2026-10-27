/** Chunk holding the app: the runtime, the router, the theme and every module the entry imports. */
export const APP_CHUNK_NAME = 'app'

/**
 * Virtual module `@vitejs/plugin-vue` adds to every SFC that exports a component
 * besides its default export, so a Markdown page does not have to repeat the
 * helper. It is shared by every page and by nothing else, so without this it
 * becomes a chunk of its own and every page entry names it as an extra file.
 */
const VUE_EXPORT_HELPER_ID = '\0plugin-vue:export-helper'

/** The slice of Rolldown's module info this grouping reads. */
interface ChunkingModuleInfo {
  /** Module ids this module imports statically. */
  importedIds: string[]
}

/** The slice of Rolldown's chunking context this grouping reads. */
interface ChunkingContext {
  getModuleInfo: (moduleId: string) => ChunkingModuleInfo | null
}

/** Names the chunk of a module, or returns `null` to leave the choice to Rolldown. */
type ChunkNameFunction = (moduleId: string, context: ChunkingContext) => string | null

/**
 * Code-splitting group that collects everything `entryId` imports statically,
 * directly or transitively.
 *
 * Rolldown's `$initial` tag cannot do this job once every Markdown page is an
 * input of its own: a page entry makes the modules only that page uses part of
 * an "initial" dependency chain as well, so page-only code would end up in the
 * app chunk and every content edit would change its hash. Walking the graph from
 * the entry keeps the app chunk to framework, router and theme code.
 */
export function appChunkGroup(entryId: string): ChunkNameFunction {
  let reachable: Set<string> | undefined

  return (moduleId, context) => {
    if (moduleId === VUE_EXPORT_HELPER_ID) {
      return APP_CHUNK_NAME
    }
    reachable ??= collectStaticImports(entryId, context)
    return moduleId !== entryId && reachable.has(moduleId)
      ? APP_CHUNK_NAME
      : null
  }
}

function collectStaticImports(
  entryId: string,
  context: ChunkingContext,
): Set<string> {
  const reachable = new Set<string>()
  const pending = [entryId]
  while (pending.length > 0) {
    const id = pending.pop()!
    if (reachable.has(id)) {
      continue
    }
    reachable.add(id)
    pending.push(...context.getModuleInfo(id)?.importedIds ?? [])
  }
  return reachable
}
