import type { MarkdownExit } from 'markdown-exit'
import { LLMS_ACTIONS_COMPONENT } from './constants'

interface MarkdownRenderEnv {
  frontmatter?: Record<string, unknown>
  ssgMarkdown?: boolean
}

export function installLlmsActionsMarkdown(markdown: MarkdownExit): void {
  const original = markdown.renderer.rules.heading_close
  const injected = new WeakSet<object>()

  markdown.renderer.rules.heading_close = (
    tokens,
    index,
    options,
    env,
    renderer,
  ) => {
    const rendered = original
      ? original(tokens, index, options, env, renderer)
      : renderer.renderToken(tokens, index, options)
    const renderEnv = env as MarkdownRenderEnv
    const frontmatter = renderEnv.frontmatter

    if (
      tokens[index].tag !== 'h1'
      || typeof env !== 'object'
      || env === null
      || injected.has(env)
      || renderEnv.ssgMarkdown
      || frontmatter?.llms === false
      || frontmatter?.layout === 'home'
    ) {
      return rendered
    }

    injected.add(env)
    return `${rendered}\n<${LLMS_ACTIONS_COMPONENT} />\n`
  }
}
