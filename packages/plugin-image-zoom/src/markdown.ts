import type { MarkdownExit, RenderRule, Token } from 'markdown-exit'
import type { ImageZoomLabels } from './labels'
import { ENGLISH_IMAGE_ZOOM_LABELS, formatImageZoomLabel } from './labels'

const ZOOM_ATTRIBUTE = 'data-kawa-zoom'
/** Hash an author appends to an image URL to keep that one image unzoomed. */
const NO_ZOOM_HASH = 'no-zoom'

type RenderRuleArgs = Parameters<RenderRule>

export interface ImageZoomRenderEnv {
  /** Route of the page being compiled. */
  path?: string
  /** Frontmatter of the page, read to skip pages that opt out. */
  frontmatter?: Record<string, unknown>
}

export interface InstallImageZoomOptions {
  /** Labels of the page being rendered, resolved once per image. */
  resolveLabels?: (path: string) => ImageZoomLabels
}

/**
 * Marks every Markdown image so the runtime can open it, and gives it the
 * button semantics a click-to-zoom image needs. The attributes are rendered
 * here, not in the browser, so server HTML and the first client render match.
 *
 * Raw HTML `<img>` tags never reach this rule, so they are never touched.
 */
export function installImageZoom(
  markdown: MarkdownExit,
  options: InstallImageZoomOptions = {},
): void {
  const renderImage = markdown.renderer.rules.image

  markdown.renderer.rules.image = (tokens, index, renderOptions, env, renderer) => {
    const renderOriginal = (): string | Promise<string> => renderImage
      ? renderImage(tokens, index, renderOptions, env, renderer)
      : renderer.renderToken(tokens, index, renderOptions)

    const token = tokens[index]
    const renderEnv = (env ?? {}) as ImageZoomRenderEnv
    const source = token.attrGet('src')

    if (!source) {
      return renderOriginal()
    }

    const { src, zoom } = splitImageSource(source)
    token.attrSet('src', src)

    if (zoom && renderEnv.frontmatter?.imageZoom !== false) {
      const labels = options.resolveLabels?.(renderEnv.path ?? '/')
        ?? ENGLISH_IMAGE_ZOOM_LABELS
      const alt = readAltText(token, renderOptions, env, renderer)

      token.attrSet(ZOOM_ATTRIBUTE, '')
      token.attrSet('role', 'button')
      token.attrSet('tabindex', '0')
      token.attrSet('aria-label', formatImageZoomLabel(labels.zoom, alt))
    }

    return renderOriginal()
  }
}

/**
 * Splits the `#no-zoom` opt-out off an image URL. Any other hash is kept,
 * because it can be a meaningful part of the image address.
 */
function splitImageSource(source: string): { src: string, zoom: boolean } {
  const hashIndex = source.indexOf('#')
  if (hashIndex < 0 || source.slice(hashIndex + 1).toLowerCase() !== NO_ZOOM_HASH) {
    return { src: source, zoom: true }
  }
  return { src: source.slice(0, hashIndex), zoom: false }
}

/**
 * Alt text of the image, stripped of inline markup exactly like the `alt`
 * attribute the renderer writes, so the accessible name and the visible alt
 * text always say the same thing.
 */
function readAltText(
  token: Token,
  renderOptions: RenderRuleArgs[2],
  env: RenderRuleArgs[3],
  renderer: RenderRuleArgs[4],
): string {
  const children = token.children
  if (!children || children.length === 0) {
    return token.content
  }
  return renderer.renderInlineAsText(children, renderOptions, env)
}
