import type { GlobOptions } from 'tinyglobby'
import type { SiteData } from '../core/site'
import type { MaybePromise } from './plugin'

const CONTENT_LOADER_SPEC = Symbol.for('kawapress.content-loader-spec')
const CONTENT_LOADER_EXECUTOR = Symbol.for('kawapress.content-loader-executor')

export type DataLoaderGlobOptions = Omit<
  GlobOptions,
  'absolute' | 'cwd' | 'patterns'
>

export interface DataLoaderOptions {
  globOptions?: DataLoaderGlobOptions
}

export interface DataLoader<T = unknown> {
  watch?: string | string[]
  load: (watchedFiles: string[]) => MaybePromise<T>
  options?: DataLoaderOptions
}

export interface DataLoaderConfig {
  /** Absolute site root. */
  readonly root: string
  /** Absolute Markdown source root. */
  readonly srcDir: string
  /** Absolute public assets directory. */
  readonly publicDir: string
  /** Serializable site data shared with the runtime. */
  readonly site: Readonly<SiteData>
}

export interface ContentData {
  url: string
  frontmatter: Record<string, unknown>
  src?: string
  html?: string
  excerpt?: string
}

export interface ContentExcerptFile {
  data: Record<string, unknown>
  content: string
  excerpt?: string
}

export type ContentExcerpt
  = | boolean
    | string
    | ((file: ContentExcerptFile, options?: unknown) => void)

export interface ContentLoaderOptions<T = ContentData[]> {
  includeSrc?: boolean
  render?: boolean
  excerpt?: ContentExcerpt
  transform?: (data: ContentData[]) => MaybePromise<T>
  globOptions?: DataLoaderGlobOptions
}

export interface ContentLoader<T = ContentData[]> extends DataLoader<T> {
  load: (watchedFiles?: string[]) => Promise<T>
}

export interface ContentLoaderSpecification<T = unknown> {
  options: ContentLoaderOptions<T>
  watch: string | string[]
}

export type ContentLoaderExecutor = (
  specification: ContentLoaderSpecification,
  watchedFiles?: string[],
) => Promise<unknown>

export function defineLoader<T>(loader: DataLoader<T>): DataLoader<T> {
  return loader
}

export function createContentLoader<T = ContentData[]>(
  watch: string | string[],
  options: ContentLoaderOptions<T> = {},
): ContentLoader<T> {
  const specification: ContentLoaderSpecification<T> = { options, watch }
  const loader: ContentLoader<T> = {
    watch,
    options: { globOptions: options.globOptions },
    async load(watchedFiles) {
      const executor: unknown = Reflect.get(globalThis, CONTENT_LOADER_EXECUTOR)
      if (typeof executor !== 'function') {
        throw new TypeError(
          'KawaPress: createContentLoader().load() requires an active KawaPress dev or build process.',
        )
      }
      return executor(specification, watchedFiles) as Promise<T>
    },
  }
  Reflect.set(loader, CONTENT_LOADER_SPEC, specification)
  return loader
}

export function getContentLoaderSpecification(
  loader: DataLoader,
): ContentLoaderSpecification | undefined {
  const specification: unknown = Reflect.get(loader, CONTENT_LOADER_SPEC)
  return isContentLoaderSpecification(specification)
    ? specification
    : undefined
}

export function installContentLoaderExecutor(
  executor: ContentLoaderExecutor,
): void {
  Reflect.set(globalThis, CONTENT_LOADER_EXECUTOR, executor)
}

function isContentLoaderSpecification(
  value: unknown,
): value is ContentLoaderSpecification {
  return typeof value === 'object'
    && value !== null
    && 'watch' in value
    && (typeof value.watch === 'string' || Array.isArray(value.watch))
    && 'options' in value
    && typeof value.options === 'object'
    && value.options !== null
}

declare global {
  // eslint-disable-next-line vars-on-top
  var KAWAPRESS_CONFIG: DataLoaderConfig | undefined
}
