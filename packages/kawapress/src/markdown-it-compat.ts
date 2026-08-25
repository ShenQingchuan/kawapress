import type {
  MarkdownExit,
  PluginWithParams,
} from 'markdown-exit'

export interface MarkdownItPluginHost {
  core: object
  block: object
  inline: object
  renderer: object
}

/**
 * Install a markdown-it plugin on MarkdownExit through one audited
 * compatibility boundary while preserving the plugin parameter types.
 */
export function useMarkdownItPlugin<
  MarkdownItInstance extends MarkdownItPluginHost,
  Params extends unknown[],
>(
  markdown: MarkdownExit,
  plugin: (markdown: MarkdownItInstance, ...params: Params) => void,
  ...params: Params
): MarkdownExit {
  return markdown.use(
    plugin as unknown as PluginWithParams,
    ...params,
  )
}
