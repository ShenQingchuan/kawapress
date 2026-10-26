import type { SecondLanguage, SiteLanguage } from './languages'
import type { TemplateValues } from './template'
import { languageLabel, localeKey } from './languages'

/** Everything the templates need to know about the project being created. */
export interface ProjectDefinition {
  projectName: string
  title: string
  kawapressVersion: string
  language: SiteLanguage
  secondLanguage: SecondLanguage
}

/** One template file and where its rendered content goes. */
export interface TemplateFile {
  /** Path relative to `packages/create-kawapress/templates/`. */
  templatePath: string
  /** Path relative to the generated project directory. */
  targetPath: string
  values: TemplateValues
}

const pages = ['index.md', 'guide/getting-started.md'] as const

/**
 * Full list of files the scaffolder writes, in creation order.
 *
 * Files of the default language go to the site root. Files of a second
 * language go under its locale prefix, which is both the URL prefix and the
 * content directory that file routing reads.
 */
export function planProjectFiles(project: ProjectDefinition): TemplateFile[] {
  const values: Record<string, string> = {
    projectName: project.projectName,
    title: project.title,
    // The title is written into a TypeScript string and a YAML scalar, so it is
    // pre-quoted with JSON escaping that both formats understand.
    titleLiteral: JSON.stringify(project.title),
    kawapressVersion: project.kawapressVersion,
  }
  const { language, secondLanguage } = project

  return [
    { templatePath: 'gitignore', targetPath: '.gitignore', values },
    { templatePath: 'package.json', targetPath: 'package.json', values },
    secondLanguage === 'none'
      ? { templatePath: 'config/single-locale.ts', targetPath: 'kawapress.config.ts', values }
      : {
          templatePath: 'config/multi-locale.ts',
          targetPath: 'kawapress.config.ts',
          values: {
            ...values,
            rootLabel: languageLabel(language),
            rootLang: language,
            secondKey: localeKey(secondLanguage),
            secondLabel: languageLabel(secondLanguage),
            secondLang: secondLanguage,
          },
        },
    ...pageFiles(language, '', values),
    ...(secondLanguage === 'none'
      ? []
      : pageFiles(secondLanguage, localeKey(secondLanguage), values)),
  ]
}

/**
 * `targetPrefix` is the directory a language lives in (empty for the default
 * language), while page templates link to each other through `prefix`, which
 * carries the leading slash.
 */
function pageFiles(
  language: SiteLanguage,
  targetPrefix: string,
  values: TemplateValues,
): TemplateFile[] {
  return pages.map(page => ({
    templatePath: `pages/${language}/${page}`,
    targetPath: targetPrefix ? `${targetPrefix}/${page}` : page,
    values: { ...values, prefix: targetPrefix ? `/${targetPrefix}` : '' },
  }))
}
