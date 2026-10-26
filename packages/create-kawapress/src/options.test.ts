import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveOptions } from './options'

const cwd = '/projects'

function resolve(args: Parameters<typeof resolveOptions>[0] = {}, context: Partial<Parameters<typeof resolveOptions>[1]> = {}) {
  return resolveOptions(args, { cwd, interactive: false, ...context })
}

describe('resolveOptions', () => {
  it('uses the documented defaults', () => {
    const options = resolve()

    expect(options.directory).toBe(join(cwd, 'kawapress-site'))
    expect(options.projectName).toBe('kawapress-site')
    expect(options.title).toBe('Kawapress Site')
    expect(options.language).toBe('en')
    expect(options.secondLanguage).toBe('none')
    expect(options.packageManager).toBe('npm')
    expect(options.install).toBe(false)
    expect(options.interactive).toBe(false)
  })

  it('resolves the directory against the working directory', () => {
    expect(resolve({ dir: 'my-site' }).directory).toBe(join(cwd, 'my-site'))
    expect(resolve({ dir: '/tmp/my-site' }).directory).toBe('/tmp/my-site')
    expect(resolve({ dir: '.' }).projectName).toBe('projects')
  })

  it('derives the project name and title from the directory', () => {
    const options = resolve({ dir: 'my-kawapress-site' })

    expect(options.projectName).toBe('my-kawapress-site')
    expect(options.title).toBe('My Kawapress Site')
  })

  it('keeps an explicit title', () => {
    expect(resolve({ dir: 'my-site', title: 'My Docs' }).title).toBe('My Docs')
    expect(resolve({ dir: 'my-site', title: '  My Docs  ' }).title).toBe('My Docs')
    expect(resolve({ dir: 'my-site', title: '   ' }).title).toBe('My Site')
  })

  it('reads languages from flags', () => {
    const options = resolve({ lang: 'zh-CN', secondLang: 'en' })

    expect(options.language).toBe('zh-CN')
    expect(options.secondLanguage).toBe('en')
  })

  it('accepts none as the second language', () => {
    expect(resolve({ secondLang: 'none' }).secondLanguage).toBe('none')
  })

  it('reads the package manager from the flag before the user agent', () => {
    expect(resolve({ pm: 'yarn' }, { userAgent: 'pnpm/11.22.0' }).packageManager).toBe('yarn')
    expect(resolve({}, { userAgent: 'pnpm/11.22.0' }).packageManager).toBe('pnpm')
  })

  it('asks about installing only when prompts are available', () => {
    expect(resolve({}, { interactive: true }).install).toBe('ask')
    expect(resolve({}, { interactive: true }).interactive).toBe(true)
    expect(resolve({ install: true }).install).toBe(true)
    expect(resolve({ install: false }, { interactive: true }).install).toBe(false)
  })

  it('skips prompts with --yes and then does not install by default', () => {
    const options = resolve({ yes: true }, { interactive: true })

    expect(options.interactive).toBe(false)
    expect(options.install).toBe(false)
  })

  it('rejects an unsupported language', () => {
    expect(() => resolve({ lang: 'fr' })).toThrow(
      'Unknown default language: "fr". Use one of: en, zh-CN.',
    )
    expect(() => resolve({ secondLang: 'fr' })).toThrow(
      'Unknown second language: "fr". Use one of: none, en, zh-CN.',
    )
  })

  it('rejects the same language twice', () => {
    expect(() => resolve({ lang: 'en', secondLang: 'en' })).toThrow(
      'The second language must differ from the default language "en".',
    )
  })

  it('rejects an unsupported package manager', () => {
    expect(() => resolve({ pm: 'npm5' })).toThrow(
      'Unknown package manager: "npm5". Use one of: npm, pnpm, yarn, bun.',
    )
  })

  it('rejects a multi-line title', () => {
    expect(() => resolve({ title: 'My\nDocs' })).toThrow(
      'The site title must be a single line of text.',
    )
  })
})
