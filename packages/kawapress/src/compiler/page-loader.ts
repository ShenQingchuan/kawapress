import type { GeneratorPluginRunner } from '../plugin/generator-runner'
import type { ParsedMarkdown } from './markdown'
import { relative, resolve, sep } from 'node:path'
import { markdownPagePathToRoutePath } from '../core/markdown-route'
import { assertPageDataSerializable } from '../core/site'
import { createMarkdownCompiler, parseMarkdown } from './markdown'

interface CachedPage {
  source: string
  parsed: Promise<ParsedMarkdown>
}

export interface MarkdownPageLoader {
  sourceRoot: string
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
  const mdPromise = createMarkdownCompiler({
    base: options.base,
    pluginRunner: options.pluginRunner,
  })
  const cache = new Map<string, CachedPage>()

  return {
    sourceRoot,
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
        assertPageDataSerializable(result.pageData)
        await options.pluginRunner.runPageData(result.pageData)
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

function markdownFileToSourcePath(file: string, sourceRoot: string): string {
  return `/${relative(sourceRoot, file).split(sep).join('/')}`
}
