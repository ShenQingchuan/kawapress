import type { KawaPressPlugin } from 'kawapress'
import type { CommentsPluginOptions } from './options'
import { definePlugin } from 'kawapress'
import { resolveCommentsOptions } from './options'
import { commentsOptionsPlugin } from './vite-plugin'

export const COMMENTS_PLUGIN_NAME = '@kawapress/plugin-comments'

/**
 * Adds a GitHub Discussions comment section to every documentation page. The
 * options are validated here, at config time, and handed to the runtime as
 * plain JSON through a virtual module.
 */
export function commentsPlugin(
  options: CommentsPluginOptions,
): KawaPressPlugin {
  const resolved = resolveCommentsOptions(options)

  return definePlugin({
    name: COMMENTS_PLUGIN_NAME,
    setup(api) {
      api.vite((config) => {
        config.plugins ??= []
        config.plugins.push(commentsOptionsPlugin(resolved))
      })
    },
  })
}

export default commentsPlugin

export type {
  CommentsLabels,
  CommentsPluginOptions,
  GiscusInputPosition,
  GiscusLoading,
  GiscusMapping,
  GiscusOptions,
  ResolvedCommentsOptions,
  ResolvedGiscusOptions,
} from './options'
export type {
  CommentsAppearance,
  CommentsProvider,
  CommentsThread,
  CommentsThreadContext,
} from './provider'
