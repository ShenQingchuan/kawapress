import type { ResolvedOptions, ScaffoldArguments } from './options'
import type { ConfirmQuestion, Prompter, SelectQuestion, TextQuestion } from './prompts'
import { spawn } from 'node:child_process'
import { relative } from 'node:path'
import process from 'node:process'
import { cancel, confirm, intro, isCancel, log, outro, select, text } from '@clack/prompts'
import { defineCommand, runMain } from 'citty'
import { siteLanguages } from './languages'
import { scaffolderVersion } from './manifest'
import { resolveOptions } from './options'
import { installCommand, runCommand } from './package-manager'
import { askInstall, askMissingValues } from './prompts'
import { scaffoldProject } from './scaffold'

interface CliContext {
  cwd: string
  userAgent?: string
  interactive: boolean
}

/**
 * clack resolves to a cancel symbol when the user aborts, so every prompt goes
 * through this adapter to turn that symbol back into a plain value.
 */
const clackPrompter: Prompter = {
  text: async (question: TextQuestion) => unwrap<string>(await text(question)),
  select: async <T extends string>(question: SelectQuestion<T>) => {
    // clack types an option list conditionally on the value type. Asking for a
    // plain string select keeps that type concrete inside the adapter.
    const value = await select<string>({
      message: question.message,
      initialValue: question.initialValue,
      options: question.choices.map(choice => ({ value: choice.value, label: choice.label })),
    })
    return unwrap<T>(value)
  },
  confirm: async (question: ConfirmQuestion) => unwrap<boolean>(await confirm(question)),
}

async function runScaffolder(args: ScaffoldArguments, context: CliContext): Promise<void> {
  const promptsEnabled = context.interactive && args.yes !== true
  if (promptsEnabled)
    intro(`create-kawapress v${scaffolderVersion}`)

  const answers = promptsEnabled
    ? await askMissingValues(args, { cwd: context.cwd }, clackPrompter)
    : {}
  const options = resolveOptions(
    { ...args, ...answers },
    { cwd: context.cwd, userAgent: context.userAgent, interactive: context.interactive },
  )

  await scaffoldProject(options)
  log.success(`Created a KawaPress site in ${options.directory}`)

  const installed = await askInstall(options.install, options.packageManager, clackPrompter)
  if (installed)
    await installDependencies(options)
  printNextSteps(options, installed)

  if (promptsEnabled)
    outro('Happy writing!')
}

async function installDependencies(options: ResolvedOptions): Promise<void> {
  log.info(`Installing dependencies with ${options.packageManager}…`)

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(options.packageManager, ['install'], {
      cwd: options.directory,
      stdio: 'inherit',
    })

    child.on('error', (error) => {
      rejectPromise(new Error(
        `Could not start "${installCommand(options.packageManager)}": ${error.message}\n`
        + `Run it yourself in ${options.directory} once ${options.packageManager} is available.`,
      ))
    })
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise()
        return
      }
      rejectPromise(new Error(
        `"${installCommand(options.packageManager)}" exited with code ${code}.\n`
        + `Run it again in ${options.directory}, or skip installing and run it later.`,
      ))
    })
  })
}

function printNextSteps(options: ResolvedOptions, installed: boolean): void {
  const steps = [
    'Next steps:',
    `  cd ${relative(process.cwd(), options.directory) || '.'}`,
  ]
  if (!installed)
    steps.push(`  ${installCommand(options.packageManager)}`)
  steps.push(`  ${runCommand(options.packageManager, 'dev')}`)

  log.info(steps.join('\n'))
}

/** Exits cleanly when the user aborts a prompt. */
function unwrap<T>(value: unknown): T {
  if (isCancel(value)) {
    cancel('Cancelled.')
    process.exit(0)
  }
  return value as T
}

export const command = defineCommand({
  meta: {
    name: 'create-kawapress',
    version: scaffolderVersion,
    description: 'Create a new KawaPress site',
  },
  args: {
    'dir': {
      type: 'positional',
      description: 'Directory to create the site in',
      required: false,
    },
    'title': {
      type: 'string',
      description: 'Site title',
    },
    'lang': {
      type: 'string',
      description: `Default site language: ${siteLanguages.join(' or ')}`,
    },
    // The kebab-case key is what citty prints in `--help`; citty also accepts
    // the camelCase spelling as an alias.
    'second-lang': {
      type: 'string',
      description: `Second site language: ${siteLanguages.join(', ')} or none`,
    },
    'pm': {
      type: 'string',
      description: 'Package manager: npm, pnpm, yarn, or bun',
    },
    'install': {
      type: 'boolean',
      description: 'Install dependencies after scaffolding',
      negativeDescription: 'Skip installing dependencies',
    },
    'yes': {
      type: 'boolean',
      description: 'Use the defaults and skip every prompt',
    },
  },
  async run({ args }) {
    const scaffoldArguments: ScaffoldArguments = {
      dir: args.dir,
      title: args.title,
      lang: args.lang,
      secondLang: args['second-lang'],
      pm: args.pm,
      install: args.install,
      yes: args.yes,
    }

    try {
      await runScaffolder(scaffoldArguments, {
        cwd: process.cwd(),
        userAgent: process.env.npm_config_user_agent,
        interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
      })
    }
    catch (error) {
      log.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    }
  },
})

runMain(command)
