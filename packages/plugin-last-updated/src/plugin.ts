import type { KawaPressPlugin } from 'kawapress'
import type { LastUpdatedPluginOptions } from './types'
import { resolve } from 'node:path'
import process from 'node:process'
import { consola } from 'consola'
import { definePlugin } from 'kawapress'
import { readGitLastUpdated } from 'kawapress/generator'
import { createEditLink, toRepositoryPath, validateEditLinkPattern } from './edit-link'
import { readGitTopLevel } from './git'
import { PLUGIN_NAME } from './name'
import { createRuntimeOptions, lastUpdatedOptionsPlugin } from './options-module'

const WARNING_LABEL = 'KawaPress Last Updated'

export function lastUpdatedPlugin(
  options: LastUpdatedPluginOptions = {},
): KawaPressPlugin {
  const runtimeOptions = createRuntimeOptions(options)
  const editLinkPattern = options.editLink
    ? validateEditLinkPattern(options.editLink.pattern)
    : undefined

  let root = process.cwd()
  let timestamps: Promise<Map<string, number>> | undefined
  let repositoryRoot: Promise<string | undefined> | undefined
  let warnedMissingRepository = false

  /** One `git log` per build or dev session, keyed by absolute source file. */
  const loadTimestamps = (): Promise<Map<string, number>> => {
    timestamps ??= readGitLastUpdated(root, {
      label: WARNING_LABEL,
      skipped: 'the last updated time',
    }).then(dates => dates ?? new Map())
    return timestamps
  }

  const loadRepositoryRoot = (): Promise<string | undefined> => {
    repositoryRoot ??= readGitTopLevel(root)
    return repositoryRoot
  }

  return definePlugin({
    name: PLUGIN_NAME,
    setup(api) {
      api.vite((config) => {
        root = config.root ? resolve(config.root) : process.cwd()
        config.plugins ??= []
        config.plugins.push(lastUpdatedOptionsPlugin(runtimeOptions))
      })

      api.pageData(async (pageData, { file }) => {
        const sourceFile = resolve(file)
        const dates = await loadTimestamps()
        const lastUpdated = dates.get(sourceFile)
        if (lastUpdated !== undefined) {
          pageData.lastUpdated = lastUpdated
        }

        if (!editLinkPattern) {
          return
        }
        const topLevel = await loadRepositoryRoot()
        if (!topLevel) {
          if (!warnedMissingRepository) {
            warnedMissingRepository = true
            consola.warn(`${WARNING_LABEL}: the site is not inside a git repository, the edit link is skipped.`)
          }
          return
        }
        const repositoryPath = toRepositoryPath(sourceFile, topLevel)
        if (repositoryPath) {
          pageData.editLink = createEditLink(editLinkPattern, repositoryPath)
        }
      })
    },
  })
}

export default lastUpdatedPlugin
