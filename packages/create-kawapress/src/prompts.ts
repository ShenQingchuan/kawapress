import type { SecondLanguage, SiteLanguage } from './languages'
import type { InstallDecision, ScaffoldArguments } from './options'
import { basename, resolve } from 'node:path'
import { languageLabel, siteLanguages } from './languages'
import { DEFAULT_PROJECT_DIRECTORY, formatProjectTitle } from './naming'
import { parseLanguage } from './options'

export interface TextQuestion {
  message: string
  placeholder?: string
  defaultValue?: string
}

export interface SelectChoice<T extends string> {
  value: T
  label: string
}

export interface SelectQuestion<T extends string> {
  message: string
  initialValue: T
  choices: readonly SelectChoice<T>[]
}

export interface ConfirmQuestion {
  message: string
  initialValue: boolean
}

/**
 * The prompts the scaffolder needs. Keeping them behind this interface lets the
 * question flow be tested without a terminal, and keeps the terminal
 * implementation in one small adapter.
 */
export interface Prompter {
  text: (question: TextQuestion) => Promise<string>
  select: <T extends string>(question: SelectQuestion<T>) => Promise<T>
  confirm: (question: ConfirmQuestion) => Promise<boolean>
}

export interface PromptContext {
  /** Directory the command runs in; a relative answer resolves against it. */
  cwd: string
}

/**
 * Asks only for values the user left out, so passing flags keeps the command
 * short. Answers come back as the same shape as parsed flags and are then
 * validated by `resolveOptions` like any other input.
 */
export async function askMissingValues(
  args: ScaffoldArguments,
  context: PromptContext,
  prompter: Prompter,
): Promise<ScaffoldArguments> {
  const answers: ScaffoldArguments = {}

  if (args.dir === undefined) {
    const directory = await prompter.text({
      message: 'Where should the site be created?',
      placeholder: DEFAULT_PROJECT_DIRECTORY,
      defaultValue: DEFAULT_PROJECT_DIRECTORY,
    })
    answers.dir = resolve(context.cwd, directory)
  }

  const directory = answers.dir ?? resolve(context.cwd, args.dir ?? DEFAULT_PROJECT_DIRECTORY)
  if (args.title === undefined) {
    answers.title = await prompter.text({
      message: 'Site title',
      defaultValue: formatProjectTitle(basename(directory)),
    })
  }

  if (args.lang === undefined) {
    answers.lang = await prompter.select<SiteLanguage>({
      message: 'Default language',
      initialValue: 'en',
      choices: siteLanguages.map(language => ({
        value: language,
        label: languageLabel(language),
      })),
    })
  }

  if (args.secondLang === undefined) {
    const language = parseLanguage(answers.lang ?? args.lang)
    answers.secondLang = await prompter.select<SecondLanguage>({
      message: 'Second language (optional)',
      initialValue: 'none',
      choices: [
        { value: 'none', label: 'None' },
        ...siteLanguages
          .filter(option => option !== language)
          .map(option => ({ value: option, label: languageLabel(option) })),
      ],
    })
  }

  return answers
}

/** Asks about installing only when the flags did not already decide it. */
export async function askInstall(
  install: InstallDecision,
  packageManager: string,
  prompter: Prompter,
): Promise<boolean> {
  if (install !== 'ask')
    return install

  return prompter.confirm({
    message: `Install dependencies with ${packageManager}?`,
    initialValue: true,
  })
}
