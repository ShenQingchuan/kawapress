import type {
  RendererRichOptions,
  TwoslashRenderer,
} from '@shikijs/twoslash'
import { rendererRich } from '@shikijs/twoslash'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { defaultHandlers, toHast } from 'mdast-util-to-hast'

type HastOptions = NonNullable<RendererRichOptions['hast']>
type PopupCompose = NonNullable<HastOptions['hoverCompose']>
type CompletionCompose = NonNullable<HastOptions['completionCompose']>
type PopupElement = Parameters<PopupCompose>[0]['popup']
type PopupNode = ReturnType<PopupCompose>[number]
type RenderMarkdown = NonNullable<RendererRichOptions['renderMarkdown']>
type RenderMarkdownInline = NonNullable<RendererRichOptions['renderMarkdownInline']>

const JSDOC_LINK_RE = /\{@link ([^}]*)\}/g
const PARAM_NAME_RE = /^([\w$-]+)/
const TWOSLASH_MENU_TAG = 'kawa-twoslash-menu'

const composePopup: PopupCompose = ({ popup, token }) => [
  {
    type: 'element',
    tagName: 'span',
    properties: {},
    children: [token],
  },
  createPopperSlot(popup),
]

const composeCompletion: CompletionCompose = ({ popup, cursor }) => [{
  type: 'element',
  tagName: TWOSLASH_MENU_TAG,
  properties: {
    'popper-class': 'shiki twoslash-floating twoslash-completion',
    'theme': 'twoslash-completion',
    ':shown': 'true',
  },
  children: [cursor, createPopperSlot(popup)],
}]

const renderMarkdown: RenderMarkdown = function (markdown) {
  const tree = fromMarkdown(
    markdown.replace(JSDOC_LINK_RE, '$1'),
    { mdastExtensions: [gfmFromMarkdown()] },
  )
  const hast = toHast(tree, {
    handlers: {
      code: (state, node) => {
        const lang = node.lang ?? ''
        if (!lang) {
          return defaultHandlers.code(state, node)
        }

        const highlighted = this.codeToHast(node.value, {
          ...this.options,
          transformers: [],
          lang,
          structure: node.value.trim().includes('\n')
            ? 'classic'
            : 'inline',
        })

        return {
          type: 'element',
          tagName: 'code',
          properties: {},
          children: highlighted.children.filter(
            child => child.type !== 'doctype',
          ),
        }
      },
    },
  })

  if (hast.type === 'root') {
    return hast.children.filter(child => child.type !== 'doctype')
  }
  if (hast.type === 'doctype') {
    return []
  }
  return [hast]
}

const renderMarkdownInline: RenderMarkdownInline = function (
  markdown,
  context,
) {
  const source = context === 'tag:param'
    ? markdown.replace(PARAM_NAME_RE, '`$1` ')
    : markdown
  const children = renderMarkdown.call(this, source)
  const first = children[0]

  return children.length === 1
    && first?.type === 'element'
    && first.tagName === 'p'
    ? first.children
    : children
}

export function rendererFloatingVue(
  options: RendererRichOptions = {},
): TwoslashRenderer {
  const menuProperties = {
    'class': 'twoslash-hover',
    'popper-class': 'shiki twoslash-floating',
    'theme': 'twoslash',
  }

  return rendererRich({
    ...options,
    renderMarkdown,
    renderMarkdownInline,
    hast: {
      hoverToken: {
        tagName: TWOSLASH_MENU_TAG,
        properties: menuProperties,
      },
      hoverCompose: composePopup,
      queryToken: {
        tagName: TWOSLASH_MENU_TAG,
        properties: {
          ...menuProperties,
          ':shown': 'true',
          'theme': 'twoslash-query',
        },
      },
      queryCompose: composePopup,
      popupDocs: { class: 'twoslash-popup-docs' },
      popupDocsTags: {
        class: 'twoslash-popup-docs twoslash-popup-docs-tags',
      },
      popupError: { class: 'twoslash-popup-error' },
      errorToken: options.errorRendering === 'hover'
        ? {
            tagName: TWOSLASH_MENU_TAG,
            properties: {
              ...menuProperties,
              class: 'twoslash-error twoslash-error-hover',
            },
          }
        : undefined,
      errorCompose: composePopup,
      completionCompose: composeCompletion,
    },
  })
}

function createPopperSlot(popup: PopupElement): PopupNode {
  popup.properties ??= {}
  popup.properties['v-pre'] = ''

  return {
    type: 'element',
    tagName: 'template',
    properties: { 'v-slot:popper': '' },
    content: {
      type: 'root',
      children: [popup],
    },
    children: [],
  } as PopupNode
}
