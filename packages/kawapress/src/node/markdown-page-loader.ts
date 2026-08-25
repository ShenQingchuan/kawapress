import type { ParsedMarkdown } from './markdown'
import type { GeneratorPluginRunner } from './plugin-runner'
import { relative, resolve, sep } from 'node:path'
import { assertPageDataSerializable } from '../site'
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
        const result = await parseMarkdown(
          md,
          source,
          markdownFileToRoutePath(file, sourceRoot),
        )
        assertPageDataSerializable(result.pageData)
        await options.pluginRunner.runPageData(result.pageData)
        assertPageDataSerializable(result.pageData)
        return result
      })
      cache.set(file, { source, parsed })
      return parsed
    },
  }
}

export function markdownFileToRoutePath(
  file: string,
  sourceRoot: string,
): string {
  const relativePath = relative(sourceRoot, file)
    .split(sep)
    .join('/')
    .replace(/\.md$/, '')

  if (relativePath === 'index') {
    return '/'
  }
  if (relativePath.endsWith('/index')) {
    return `/${relativePath.slice(0, -'/index'.length)}`
  }
  return `/${relativePath}`
}
