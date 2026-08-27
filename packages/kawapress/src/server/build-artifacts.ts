import type { BuildArtifactsContext } from '../api/plugin'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

export function createBuildArtifactEmitter(
  root: string,
  outDir = 'dist',
): BuildArtifactsContext['emitFile'] {
  const outputRoot = resolve(root, outDir)
  const emitted = new Set<string>()

  return async (path, content) => {
    const normalized = validateArtifactPath(path)
    if (emitted.has(normalized)) {
      throw new Error(
        `KawaPress: build artifact ${JSON.stringify(normalized)} was emitted more than once.`,
      )
    }

    const file = resolveOutputPath(outputRoot, normalized)
    await mkdir(dirname(file), { recursive: true })
    try {
      await writeFile(file, content, { flag: 'wx' })
    }
    catch (error) {
      if (isFileExistsError(error)) {
        throw new Error(
          `KawaPress: build artifact ${JSON.stringify(normalized)} conflicts with an existing output file.`,
          { cause: error },
        )
      }
      throw error
    }
    emitted.add(normalized)
  }
}

export function createBuildArtifactImporter(
  root: string,
  outDir = 'dist',
): BuildArtifactsContext['importModule'] {
  const outputRoot = resolve(root, outDir)

  return async <T = unknown>(path: string): Promise<T> => {
    const normalized = validateArtifactPath(path)
    const file = resolveOutputPath(outputRoot, normalized)
    return import(
      `${pathToFileURL(file).href}?kawapress=${Date.now()}`,
    ) as Promise<T>
  }
}

function resolveOutputPath(outputRoot: string, path: string): string {
  const file = resolve(outputRoot, ...path.split('/'))
  const relativePath = relative(outputRoot, file)
  if (
    isAbsolute(relativePath)
    || relativePath === '..'
    || relativePath.startsWith(`..${sep}`)
  ) {
    throw new Error(
      `KawaPress: build artifact path ${JSON.stringify(path)} escapes the output directory.`,
    )
  }
  return file
}

function validateArtifactPath(path: string): string {
  if (!path || isAbsolute(path) || path.includes('\\')) {
    throw new Error(
      `KawaPress: build artifact path must be a non-empty relative POSIX path, got ${JSON.stringify(path)}.`,
    )
  }

  const segments = path.split('/')
  if (segments.some(segment => !segment || segment === '.' || segment === '..')) {
    throw new Error(
      `KawaPress: build artifact path must stay inside the output directory, got ${JSON.stringify(path)}.`,
    )
  }
  return segments.join('/')
}

function isFileExistsError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error
    && 'code' in error
    && error.code === 'EEXIST'
}
