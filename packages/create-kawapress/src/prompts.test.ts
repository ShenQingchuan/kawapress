import type { PromptContext, Prompter, SelectQuestion, TextQuestion } from './prompts'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { askInstall, askMissingValues } from './prompts'

interface PromptLog {
  text: TextQuestion[]
  select: SelectQuestion<string>[]
  confirm: string[]
}

/**
 * Fake terminal that answers from a queue and records every question, so the
 * question flow can be asserted without a TTY.
 */
function createPrompter(answers: {
  text?: string[]
  select?: string[]
  confirm?: boolean
} = {}): { prompter: Prompter, log: PromptLog } {
  const log: PromptLog = { text: [], select: [], confirm: [] }
  let textIndex = 0
  let selectIndex = 0

  return {
    log,
    prompter: {
      async text(question) {
        log.text.push(question)
        const answer = answers.text?.[textIndex] ?? question.defaultValue ?? ''
        textIndex += 1
        return answer
      },
      async select<T extends string>(question: SelectQuestion<T>) {
        log.select.push(question)
        const answer = answers.select?.[selectIndex] as T | undefined
        selectIndex += 1
        return answer ?? question.initialValue
      },
      async confirm(question) {
        log.confirm.push(question.message)
        return answers.confirm ?? question.initialValue
      },
    },
  }
}

const context: PromptContext = { cwd: '/projects' }

describe('askMissingValues', () => {
  it('asks nothing when every value came from a flag', async () => {
    const { prompter, log } = createPrompter()
    const args = {
      dir: 'my-site',
      title: 'My Docs',
      lang: 'en',
      secondLang: 'none',
    }

    const answers = await askMissingValues(args, context, prompter)

    expect(answers).toEqual({})
    expect(log).toEqual({ text: [], select: [], confirm: [] })
  })

  it('asks for the directory and resolves the answer', async () => {
    const { prompter, log } = createPrompter({ text: ['my-site'] })

    const answers = await askMissingValues({}, context, prompter)

    expect(answers.dir).toBe(join(context.cwd, 'my-site'))
    expect(log.text[0]).toMatchObject({
      message: 'Where should the site be created?',
      placeholder: 'kawapress-site',
      defaultValue: 'kawapress-site',
    })
  })

  it('offers the directory name as the site title', async () => {
    const { prompter, log } = createPrompter({ text: ['my-kawapress-site'] })

    const answers = await askMissingValues({}, context, prompter)

    expect(answers.title).toBe('My Kawapress Site')
    expect(log.text[1]).toMatchObject({
      message: 'Site title',
      defaultValue: 'My Kawapress Site',
    })
  })

  it('keeps a title that came from a flag', async () => {
    const { prompter, log } = createPrompter({ select: [], text: [] })

    const answers = await askMissingValues({ dir: 'my-site', title: 'My Docs' }, context, prompter)

    expect(answers.title).toBeUndefined()
    expect(log.text).toHaveLength(0)
  })

  it('offers English first and both languages', async () => {
    const { prompter, log } = createPrompter({ select: ['en', 'none'] })

    await askMissingValues({ dir: 'my-site', title: 'My Docs' }, context, prompter)

    expect(log.select[0]).toMatchObject({
      message: 'Default language',
      initialValue: 'en',
      choices: [
        { value: 'en', label: 'English' },
        { value: 'zh-CN', label: '简体中文' },
      ],
    })
  })

  it('hides the default language from the second-language choices', async () => {
    const { prompter, log } = createPrompter({ select: ['zh-CN', 'en'] })

    const answers = await askMissingValues({ dir: 'my-site', title: 'My Docs' }, context, prompter)

    expect(answers).toEqual({ lang: 'zh-CN', secondLang: 'en' })
    expect(log.select[1]).toMatchObject({
      message: 'Second language (optional)',
      initialValue: 'none',
      choices: [
        { value: 'none', label: 'None' },
        { value: 'en', label: 'English' },
      ],
    })
  })

  it('skips the questions a flag already answered', async () => {
    const { prompter, log } = createPrompter({ select: ['none'] })

    const answers = await askMissingValues({ dir: 'my-site', title: 'My Docs', lang: 'en' }, context, prompter)

    expect(answers).toEqual({ secondLang: 'none' })
    expect(log.select).toHaveLength(1)
  })
})

describe('askInstall', () => {
  it('returns a decided value without prompting', async () => {
    const { prompter, log } = createPrompter()

    expect(await askInstall(true, 'pnpm', prompter)).toBe(true)
    expect(await askInstall(false, 'pnpm', prompter)).toBe(false)
    expect(log.confirm).toHaveLength(0)
  })

  it('asks with the chosen package manager and installs by default', async () => {
    const { prompter, log } = createPrompter()

    expect(await askInstall('ask', 'yarn', prompter)).toBe(true)
    expect(log.confirm).toEqual(['Install dependencies with yarn?'])
  })
})
