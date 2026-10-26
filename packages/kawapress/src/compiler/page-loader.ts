import type { GeneratorPluginRunner } from '../plugin/generator-runner'
import type { LinkRegistry } from './link-registry'
import type { ParsedMarkdown } from './markdown'
import { relative, resolve, sep } from 'node:path'
import { markdownPagePathToRoutePath } from '../core/markdown-route'
import { assertPageDataSerializable } from '../core/site'
import { createLinkRegistry } from './link-registry'
import { createMarkdownCompiler, parseMarkdown } from './markdown'

interface CachedPage {
  source: string
  parsed: Promise<ParsedMarkdown>
}

export interface MarkdownPageLoader {
  sourceRoot: string
  /** Links and heading IDs of every page loaded so far. */
  registry: LinkRegistry
  load: (source: string, file: string) => Promise<ParsedMarkdown>
}

export interface MarkdownPageLoaderOptions {
  root: string
  base: string
  srcDir: string
  pluginRunner: GeneratorPluginRunner
}

export function createMarkdownPageLoader(
  options: MarkdownPageLoaderOptions,
): MarkdownPageLoader {
  const sourceRoot = resolve(options.root, options.srcDir)
  const registry = createLinkRegistry()
  const mdPromise = createMarkdownCompiler({
    base: options.base,
    pluginRunner: options.pluginRunner,
  })
  const cache = new Map<string, CachedPage>()

  return {
    sourceRoot,
    registry,
    load(source, file) {
      const cached = cache.get(file)
      if (cached?.source === source) {
        return cached.parsed
      }

      const parsed = mdPromise.then(async (md) => {
        const sourcePath = markdownFileToSourcePath(file, sourceRoot)
        const routePath = markdownPagePathToRoutePath(sourcePath)
        const result = await parseMarkdown(
          md,
          source,
          routePath,
          sourcePath,
        )
        registry.set({
          route: routePath,
          source: sourcePath,
          headings: result.env.headings ?? [],
          links: result.env.links ?? [],
        })
        assertPageDataSerializable(result.pageData)
        await options.pluginRunner.runPageData(result.pageData, { file, sourcePath })
        assertPageDataSerializable(result.pageData)
        await options.pluginRunner.runPageArtifact({
          source,
          file,
          sourcePath,
          routePath,
          pageData: result.pageData,
        })
        return result
      })
      cache.set(file, { source, parsed })
      return parsed
    },
  }
}

/** Path of a Markdown file relative to srcDir, for example `/guide/intro.md`. */
export function markdownFileToSourcePath(file: string, sourceRoot: string): string {
  return `/${relative(sourceRoot, file).split(sep).join('/')}`
}
