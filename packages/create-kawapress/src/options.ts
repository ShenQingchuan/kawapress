import type { SecondLanguage, SiteLanguage } from './languages'
import type { PackageManager } from './package-manager'
import { basename, resolve } from 'node:path'
import {
  isSiteLanguage,
  siteLanguages,
} from './languages'
import {
  DEFAULT_PROJECT_DIRECTORY,
  formatProjectTitle,
  toProjectName,
} from './naming'
import { detectPackageManager, isPackageManager, packageManagers } from './package-manager'

/** Raw command line input, already parsed by citty. */
export interface ScaffoldArguments {
  dir?: string
  title?: string
  lang?: string
  secondLang?: string
  pm?: string
  install?: boolean
  yes?: boolean
}

export interface ResolveOptionsContext {
  /** Directory the command runs in; a relative `dir` resolves against it. */
  cwd: string
  /** Value of `npm_config_user_agent`, used to guess the package manager. */
  userAgent?: string
  /** Whether prompts may be shown at all. `--yes` still turns them off. */
  interactive: boolean
}

/**
 * `ask` means the user has not decided yet and an interactive prompt will ask.
 * It only appears when prompts are available.
 */
export type InstallDecision = boolean | 'ask'

export interface ResolvedOptions {
  /** Absolute path of the directory that will receive the generated files. */
  directory: string
  projectName: string
  title: string
  language: SiteLanguage
  secondLanguage: SecondLanguage
  packageManager: PackageManager
  install: InstallDecision
  interactive: boolean
}

export function resolveOptions(
  args: ScaffoldArguments,
  context: ResolveOptionsContext,
): ResolvedOptions {
  const directory = resolve(context.cwd, args.dir ?? DEFAULT_PROJECT_DIRECTORY)
  const language = parseLanguage(args.lang)
  const secondLanguage = parseSecondLanguage(args.secondLang, language)
  const interactive = context.interactive && args.yes !== true

  return {
    directory,
    projectName: toProjectName(basename(directory)),
    title: parseTitle(args.title) ?? formatProjectTitle(basename(directory)),
    language,
    secondLanguage,
    packageManager: args.pm === undefined
      ? detectPackageManager(context.userAgent)
      : parsePackageManager(args.pm),
    install: resolveInstall(args.install, interactive),
    interactive,
  }
}

export function parseLanguage(value: string | undefined): SiteLanguage {
  if (value === undefined)
    return 'en'
  if (!isSiteLanguage(value)) {
    throw new Error(
      `Unknown default language: "${value}". Use one of: ${siteLanguages.join(', ')}.`,
    )
  }
  return value
}

export function parseSecondLanguage(
  value: string | undefined,
  language: SiteLanguage,
): SecondLanguage {
  if (value === undefined || value === 'none')
    return 'none'
  if (!isSiteLanguage(value))
    throw new Error(`Unknown second language: "${value}". Use one of: none, ${siteLanguages.join(', ')}.`)
  if (value === language) {
    throw new Error(
      `The second language must differ from the default language "${language}". `
      + `Pick another language, or leave --second-lang out to generate a single-language site.`,
    )
  }
  return value
}

export function parseTitle(value: string | undefined): string | undefined {
  const title = value?.trim()
  if (!title)
    return undefined
  if (/[\r\n]/.test(title)) {
    throw new Error('The site title must be a single line of text.')
  }
  return title
}

export function parsePackageManager(value: string): PackageManager {
  if (!isPackageManager(value)) {
    throw new Error(
      `Unknown package manager: "${value}". Use one of: ${packageManagers.join(', ')}.`,
    )
  }
  return value
}

function resolveInstall(install: boolean | undefined, interactive: boolean): InstallDecision {
  if (install !== undefined)
    return install
  return interactive ? 'ask' : false
}
