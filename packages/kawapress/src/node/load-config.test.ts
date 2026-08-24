import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadSiteConfigWithDependencies } from './load-config'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root =>
    rm(root, { recursive: true, force: true }),
  ))
})

describe('site config loading', () => {
  it('tracks local modules imported by the config', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kawapress-config-'))
    roots.push(root)
    const helperPath = join(root, 'site-title.ts')
    await writeFile(helperPath, 'export const title = "Imported title"\n')
    await writeFile(
      join(root, 'kawapress.config.ts'),
      'import { title } from "./site-title"\nexport default { title }\n',
    )

    const loaded = await loadSiteConfigWithDependencies(root)

    expect(loaded.config.title).toBe('Imported title')
    expect(loaded.dependencies).toContain(await realpath(helperPath))
  })
})
