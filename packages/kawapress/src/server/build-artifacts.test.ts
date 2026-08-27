import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createBuildArtifactEmitter,
  createBuildArtifactImporter,
} from './build-artifacts'

describe('build artifact emitter', () => {
  it('writes relative files inside dist and rejects duplicates', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-artifacts-'))

    try {
      const emitFile = createBuildArtifactEmitter(root)
      const importModule = createBuildArtifactImporter(root)
      await emitFile('en/llms.txt', '# English\n')
      await emitFile('.temp/render.mjs', 'export const answer = 42\n')

      await expect(readFile(join(root, 'dist/en/llms.txt'), 'utf8'))
        .resolves
        .toBe('# English\n')
      await expect(importModule<{ answer: number }>('.temp/render.mjs'))
        .resolves
        .toMatchObject({ answer: 42 })
      await expect(emitFile('en/llms.txt', '# Duplicate\n'))
        .rejects
        .toThrow('was emitted more than once')
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  it('rejects escaped paths and existing public output', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-artifacts-'))

    try {
      const emitFile = createBuildArtifactEmitter(root)
      await expect(emitFile('../outside.txt', 'no'))
        .rejects
        .toThrow('must stay inside the output directory')

      await expect(emitFile('/absolute.txt', 'no'))
        .rejects
        .toThrow('must be a non-empty relative POSIX path')

      const emitIntoRoot = createBuildArtifactEmitter(root, '.')
      await writeFile(join(root, 'public.txt'), 'public')
      await expect(emitIntoRoot('public.txt', 'plugin'))
        .rejects
        .toThrow('conflicts with an existing output file')
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })
})
