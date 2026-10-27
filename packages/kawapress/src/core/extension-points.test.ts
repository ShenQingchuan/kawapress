import type { PageData, PageFrontmatter, ThemeConfig } from 'kawapress'
import { describe, expect, it } from 'vitest'

/**
 * These declarations are what a plugin writes in its own package. The test
 * file is type-checked with the rest of the repository (`pnpm typecheck`), so
 * the assertions below fail to compile when an augmentation stops reaching the
 * types that readers use.
 */
declare module 'kawapress' {
  interface PageData {
    extensionPointsProbe?: number
  }

  interface PageFrontmatter {
    extensionPointsProbe?: boolean
  }

  interface ThemeConfig {
    extensionPointsProbe?: string
  }
}

describe('type extension points', () => {
  it('lets a package add fields that every reader sees', () => {
    const page: PageData = {
      path: '/',
      title: 'Home',
      frontmatter: {},
      headers: [],
      extensionPointsProbe: 1,
    }
    const frontmatter: PageFrontmatter = { extensionPointsProbe: true }
    const theme: Partial<ThemeConfig> = { extensionPointsProbe: 'x' }

    expect(page.extensionPointsProbe).toBe(1)
    expect(frontmatter.extensionPointsProbe).toBe(true)
    expect(theme.extensionPointsProbe).toBe('x')
  })

  it('keeps frontmatter open for keys that no package declares', () => {
    const frontmatter: PageFrontmatter = { anythingTheAuthorWrites: 42 }
    expect(frontmatter.anythingTheAuthorWrites).toBe(42)
  })

  it('rejects a value of the wrong type for a declared field', () => {
    // @ts-expect-error a declared field keeps its type
    const frontmatter: PageFrontmatter = { extensionPointsProbe: 'not a boolean' }
    // @ts-expect-error a field nobody declared is not a theme option
    const theme: Partial<ThemeConfig> = { notDeclaredByAnyPackage: 1 }

    expect(frontmatter).toBeDefined()
    expect(theme).toBeDefined()
  })
})
