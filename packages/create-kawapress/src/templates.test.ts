import type { ProjectDefinition } from './templates'
import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { templatesDirectory } from './scaffold'
import { planProjectFiles } from './templates'

const baseProject: ProjectDefinition = {
  projectName: 'my-site',
  title: 'Qingchuan\'s Docs',
  kawapressVersion: '0.0.1',
  language: 'en',
  secondLanguage: 'none',
}

function targetPaths(project: ProjectDefinition): string[] {
  return planProjectFiles(project).map(file => file.targetPath)
}

function fileFor(project: ProjectDefinition, targetPath: string) {
  const file = planProjectFiles(project).find(candidate => candidate.targetPath === targetPath)
  if (!file)
    throw new Error(`No template is planned for ${targetPath}`)
  return file
}

describe('planProjectFiles', () => {
  it('lists the files of a single-language site', () => {
    expect(targetPaths(baseProject)).toEqual([
      '.gitignore',
      'package.json',
      'kawapress.config.ts',
      'index.md',
      'guide/getting-started.md',
    ])
  })

  it('puts a second language under its locale prefix', () => {
    const project: ProjectDefinition = { ...baseProject, secondLanguage: 'zh-CN' }

    expect(targetPaths(project)).toEqual([
      '.gitignore',
      'package.json',
      'kawapress.config.ts',
      'index.md',
      'guide/getting-started.md',
      'zh/index.md',
      'zh/guide/getting-started.md',
    ])
  })

  it('keeps the default language at the site root when it is Chinese', () => {
    const project: ProjectDefinition = {
      ...baseProject,
      language: 'zh-CN',
      secondLanguage: 'en',
    }

    expect(targetPaths(project)).toEqual([
      '.gitignore',
      'package.json',
      'kawapress.config.ts',
      'index.md',
      'guide/getting-started.md',
      'en/index.md',
      'en/guide/getting-started.md',
    ])
  })

  it('fills the package manifest with the project name and KawaPress version', () => {
    expect(fileFor(baseProject, 'package.json').values).toMatchObject({
      projectName: 'my-site',
      kawapressVersion: '0.0.1',
    })
  })

  it('pre-quotes the title so quotes survive in TypeScript and YAML', () => {
    expect(fileFor(baseProject, 'index.md').values.titleLiteral).toBe('"Qingchuan\'s Docs"')
    expect(fileFor(baseProject, 'index.md').values.title).toBe('Qingchuan\'s Docs')
  })

  it('uses the single-locale config without a second language', () => {
    expect(fileFor(baseProject, 'kawapress.config.ts').templatePath).toBe('config/single-locale.ts')
  })

  it('describes both languages in a localized config', () => {
    const project: ProjectDefinition = {
      ...baseProject,
      language: 'zh-CN',
      secondLanguage: 'en',
    }

    expect(fileFor(project, 'kawapress.config.ts')).toMatchObject({
      templatePath: 'config/multi-locale.ts',
      values: {
        rootLabel: '简体中文',
        rootLang: 'zh-CN',
        secondKey: 'en',
        secondLabel: 'English',
        secondLang: 'en',
      },
    })
  })

  it('links pages through the locale prefix of their language', () => {
    const project: ProjectDefinition = { ...baseProject, secondLanguage: 'zh-CN' }

    expect(fileFor(project, 'guide/getting-started.md').values.prefix).toBe('')
    expect(fileFor(project, 'zh/guide/getting-started.md').values.prefix).toBe('/zh')
    expect(fileFor(project, 'zh/index.md').values.prefix).toBe('/zh')
  })

  it('sources pages from the language that owns them', () => {
    const project: ProjectDefinition = {
      ...baseProject,
      language: 'zh-CN',
      secondLanguage: 'en',
    }

    expect(fileFor(project, 'index.md').templatePath).toBe('pages/zh-CN/index.md')
    expect(fileFor(project, 'en/index.md').templatePath).toBe('pages/en/index.md')
  })

  it.each([
    ['en', 'none'],
    ['en', 'zh-CN'],
    ['zh-CN', 'en'],
    ['zh-CN', 'none'],
  ] as const)('points at template files that exist for %s with second language %s', async (language, secondLanguage) => {
    const project: ProjectDefinition = { ...baseProject, language, secondLanguage }

    for (const file of planProjectFiles(project))
      await expect(access(join(templatesDirectory, file.templatePath))).resolves.toBeUndefined()
  })
})
