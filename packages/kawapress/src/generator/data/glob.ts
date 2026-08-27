import type { DataLoaderGlobOptions } from '../../api/data'
import { resolve } from 'node:path'
import { glob } from 'tinyglobby'
import { normalizePath } from 'vite'

const DEFAULT_IGNORES = [
  '**/node_modules/**',
  '**/dist/**',
]

export function normalizeDataLoaderGlob(
  patterns: string | string[] | undefined,
  base: string,
): string[] {
  const values = typeof patterns === 'string' ? [patterns] : patterns ?? []
  return values.map((pattern) => {
    if (pattern.startsWith('!')) {
      return `!${normalizePath(resolve(base, pattern.slice(1)))}`
    }
    return normalizePath(resolve(base, pattern))
  })
}

export async function findDataLoaderFiles(
  patterns: string[],
  options: DataLoaderGlobOptions = {},
): Promise<string[]> {
  if (patterns.length === 0) {
    return []
  }

  const ignores = typeof options.ignore === 'string'
    ? [options.ignore]
    : options.ignore ?? []
  const files = await glob(patterns, {
    ...options,
    absolute: true,
    expandDirectories: false,
    ignore: [...DEFAULT_IGNORES, ...ignores],
    onlyDirectories: false,
    onlyFiles: true,
  })

  return files.map(normalizePath).sort()
}
