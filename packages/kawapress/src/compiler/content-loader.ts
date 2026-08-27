import type { MarkdownExit } from 'markdown-exit'
import type {
  ContentData,
  ContentExcerpt,
  ContentExcerptFile,
  ContentLoaderExecutor,
  ContentLoaderOptions,
  ContentLoaderSpecification,
} from '../api/data'
import type { InternalDataLoaderContext } from '../generator/data/context'
import { readFile, stat } from 'node:fs/promises'
import { isAbsolute, relative, sep } from 'node:path'
import matter from 'gray-matter'
import { normalizePath } from 'vite'
import { normalizeFrontmatterSource } from '../core/frontmatter'
import { markdownPagePathToRoutePath } from '../core/markdown-route'
import { findDataLoaderFiles, normalizeDataLoaderGlob } from '../generator/data/glob'
import { createMarkdownCompiler } from './markdown'

interface CachedContent {
  data: ContentData
  mtimeMs: number
  size: number
}

interface ContentLoaderState {
  cache: Map<string, CachedContent>
  markdownPromise?: Promise<MarkdownExit>
}

export function createContentLoaderExecutor(
  context: InternalDataLoaderContext,
): ContentLoaderExecutor {
  const states = new WeakMap<ContentLoaderSpecification, ContentLoaderState>()

  return async (specification, watchedFiles) => {
    validateContentPatterns(specification.watch)
    const state = getContentLoaderState(states, specification)
    const patterns = normalizeDataLoaderGlob(
      specification.watch,
      context.srcDir,
    )
    const files = watchedFiles ?? await findDataLoaderFiles(
      patterns,
      specification.options.globOptions,
    )
    const entries = await Promise.all(files.map(async (file) => {
      if (!file.endsWith('.md')) {
        return undefined
      }
      return loadContentFile(
        file,
        context,
        specification.options,
        state,
      )
    }))
    const data = entries.filter(
      (entry): entry is ContentData => entry !== undefined,
    )

    if (specification.options.transform) {
      return specification.options.transform(data)
    }
    return data
  }
}

async function loadContentFile(
  file: string,
  context: InternalDataLoaderContext,
  options: ContentLoaderOptions<unknown>,
  state: ContentLoaderState,
): Promise<ContentData> {
  const fileStat = await stat(file)
  const cached = state.cache.get(file)
  if (cached
    && cached.mtimeMs === fileStat.mtimeMs
    && cached.size === fileStat.size) {
    return cached.data
  }

  try {
    const src = await readFile(file, 'utf8')
    const parsed = parseContentSource(src, options.excerpt)
    const sourcePath = contentFileToSourcePath(file, context.srcDir)
    const url = markdownPagePathToRoutePath(sourcePath)
    const data: ContentData = {
      url,
      frontmatter: parsed.data,
    }

    if (options.includeSrc) {
      data.src = src
    }
    if (options.render) {
      data.html = await renderContent(
        await getMarkdown(state, context),
        src,
        url,
        sourcePath,
      )
    }
    if (options.excerpt && parsed.excerpt) {
      data.excerpt = await renderContent(
        await getMarkdown(state, context),
        parsed.excerpt,
        url,
        sourcePath,
      )
    }

    state.cache.set(file, {
      data,
      mtimeMs: fileStat.mtimeMs,
      size: fileStat.size,
    })
    return data
  }
  catch (cause) {
    throw new Error(
      `KawaPress: failed to load Markdown content ${JSON.stringify(file)}.`,
      { cause },
    )
  }
}

function getContentLoaderState(
  states: WeakMap<ContentLoaderSpecification, ContentLoaderState>,
  specification: ContentLoaderSpecification,
): ContentLoaderState {
  const existing = states.get(specification)
  if (existing) {
    return existing
  }
  const state: ContentLoaderState = { cache: new Map() }
  states.set(specification, state)
  return state
}

function getMarkdown(
  state: ContentLoaderState,
  context: InternalDataLoaderContext,
): Promise<MarkdownExit> {
  state.markdownPromise ??= createMarkdownCompiler({
    base: context.site.base,
    pluginRunner: context.pluginRunner,
  })
  return state.markdownPromise
}

function parseContentSource(
  src: string,
  excerpt: ContentExcerpt | undefined,
): ContentExcerptFile {
  const normalized = normalizeFrontmatterSource(src)
  const parsed = typeof excerpt === 'string'
    ? matter(normalized, { excerpt_separator: excerpt })
    : matter(normalized, { excerpt: excerpt === true })
  const file = parsed as unknown as ContentExcerptFile

  if (typeof excerpt === 'function') {
    excerpt(file)
  }
  return file
}

function renderContent(
  markdown: MarkdownExit,
  source: string,
  path: string,
  sourcePath: string,
): Promise<string> {
  return markdown.renderAsync(source, { path, sourcePath })
}

function contentFileToSourcePath(file: string, sourceRoot: string): string {
  const relativePath = relative(sourceRoot, file)
  if (isOutsideDirectory(relativePath)) {
    throw new Error(
      `KawaPress: createContentLoader matched a file outside srcDir: ${JSON.stringify(file)}.`,
    )
  }
  return `/${normalizePath(relativePath)}`
}

function validateContentPatterns(
  patterns: string | string[],
): void {
  const values = typeof patterns === 'string' ? [patterns] : patterns
  for (const value of values) {
    const pattern = value.startsWith('!') ? value.slice(1) : value
    if (!pattern || isAbsolute(pattern) || isOutsideDirectory(pattern)) {
      throw new Error(
        `KawaPress: createContentLoader pattern must stay inside srcDir, got ${JSON.stringify(value)}.`,
      )
    }
  }
}

function isOutsideDirectory(path: string): boolean {
  return path === '..'
    || path.startsWith(`..${sep}`)
    || path.replaceAll('\\', '/').startsWith('../')
}
