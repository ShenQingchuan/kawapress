import type { MarkdownItContainerOptions } from '@mdit/plugin-container'
import type { KawaPressPlugin } from 'kawapress'
import type { MarkdownExit } from 'markdown-exit'
import { container } from '@mdit/plugin-container'
import { definePlugin, useMarkdownItPlugin } from 'kawapress'

const OPEN_TOKEN = 'container_code-group_open'
const CLOSE_TOKEN = 'container_code-group_close'
const META_KEY = 'kawapressCodeGroup'

interface CodeGroupMeta {
  labels?: string[]
  panel?: number
}

export function codeGroupPlugin(): KawaPressPlugin {
  return definePlugin({
    name: '@kawapress/plugin-code-group',
    setup(api) {
      api.markdown((markdown) => {
        installCodeGroup(markdown)
      })
    },
  })
}

export default codeGroupPlugin

export function installCodeGroup(markdown: MarkdownExit): void {
  const options: MarkdownItContainerOptions = {
    name: 'code-group',
    validate: params => params.trim() === 'code-group',
    openRender(tokens, index) {
      const labels = getCodeGroupMeta(tokens[index]).labels ?? []
      return `<KawaCodeGroup :labels='${escapeSingleQuotedAttribute(JSON.stringify(labels))}'>\n`
    },
    closeRender: () => '</KawaCodeGroup>\n',
  }
  useMarkdownItPlugin(markdown, container, options)

  markdown.core.ruler.after('block', 'kawapress:code-group', (state) => {
    const groups: { labels: string[], open: number }[] = []

    for (const [index, token] of state.tokens.entries()) {
      if (token.type === OPEN_TOKEN) {
        groups.push({ labels: [], open: index })
        continue
      }
      if (token.type === CLOSE_TOKEN) {
        const group = groups.pop()
        if (group) {
          getCodeGroupMeta(state.tokens[group.open]).labels = group.labels
        }
        continue
      }

      const group = groups.at(-1)
      if (!group) {
        continue
      }
      if (token.type !== 'fence') {
        throw new Error(
          `KawaPress code-group only accepts fenced code blocks, found ${JSON.stringify(token.type)}.`,
        )
      }

      const panel = group.labels.length
      group.labels.push(readFenceLabel(token.info, panel))
      getCodeGroupMeta(token).panel = panel
    }
  })

  const renderFence = markdown.renderer.rules.fence
  markdown.renderer.rules.fence = (tokens, index, options, env, renderer) => {
    const html = renderFence
      ? renderFence(tokens, index, options, env, renderer)
      : renderer.renderToken(tokens, index, options)
    const panel = getCodeGroupMeta(tokens[index]).panel
    if (panel === undefined) {
      return html
    }
    const wrap = (rendered: string): string => (
      `<template #panel-${panel}>\n${rendered}</template>\n`
    )
    return typeof html === 'string' ? wrap(html) : html.then(wrap)
  }
}

function getCodeGroupMeta(token: { meta: unknown }): CodeGroupMeta {
  const metadata = token.meta && typeof token.meta === 'object'
    ? token.meta as Record<string, unknown>
    : {}
  token.meta = metadata
  metadata[META_KEY] ??= {}
  return metadata[META_KEY] as CodeGroupMeta
}

function readFenceLabel(info: string, panel: number): string {
  const label = info.match(/\[([^\]]+)\]\s*$/)?.[1]?.trim()
  if (label) {
    return label
  }
  return info.trim().split(/\s+/, 1)[0] || `Code ${panel + 1}`
}

function escapeSingleQuotedAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('\'', '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
