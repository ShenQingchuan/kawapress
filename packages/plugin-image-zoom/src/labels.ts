import type { ImageZoomLocaleLanguages } from './locale'
import { resolveLocaleIndex } from 'kawapress'

export interface ImageZoomLabels {
  /** Accessible name of a zoomable image. `{alt}` is replaced by the image alt text. */
  zoom: string
  /** Accessible name of the zoom dialog. */
  dialog: string
}

export interface ImageZoomPluginOptions {
  /** Override default labels for every locale. */
  labels?: Partial<ImageZoomLabels>
  /** Override default labels for one KawaPress locale key. */
  localeLabels?: Record<string, Partial<ImageZoomLabels>>
}

export interface ImageZoomLabelSources extends ImageZoomPluginOptions {
  localeLanguages?: ImageZoomLocaleLanguages
}

export const ENGLISH_IMAGE_ZOOM_LABELS: ImageZoomLabels = {
  zoom: 'Zoom image: {alt}',
  dialog: 'Image zoom',
}

export const CHINESE_IMAGE_ZOOM_LABELS: ImageZoomLabels = {
  zoom: '放大图片：{alt}',
  dialog: '图片缩放',
}

const ALT_PLACEHOLDER_RE = /\{alt\}/g
const TRAILING_SEPARATOR_RE = /[\s:：]+$/

/**
 * Builds the label lookup both sides need. The generator resolves labels per
 * page path while rendering, the runtime resolves them per route while the
 * visitor interacts, and both share this function.
 */
export function createImageZoomLabelResolver(
  sources: ImageZoomLabelSources,
): (path: string) => ImageZoomLabels {
  const localeLanguages = sources.localeLanguages ?? {}

  return (path) => {
    const localeIndex = resolveLocaleIndex(path, Object.keys(localeLanguages))
    const language = localeLanguages[localeIndex]
    const builtIn = language?.toLowerCase().startsWith('zh')
      ? CHINESE_IMAGE_ZOOM_LABELS
      : ENGLISH_IMAGE_ZOOM_LABELS

    return {
      ...builtIn,
      ...sources.labels,
      ...sources.localeLabels?.[localeIndex],
    }
  }
}

/**
 * Fills `{alt}` in a label template. Without alt text the separator in front of
 * the placeholder is dropped too, so the name reads "Zoom image" instead of
 * "Zoom image: ".
 */
export function formatImageZoomLabel(template: string, alt: string): string {
  const text = alt.trim()
  if (text) {
    return template.replace(ALT_PLACEHOLDER_RE, () => text)
  }
  return template
    .replace(ALT_PLACEHOLDER_RE, '')
    .replace(TRAILING_SEPARATOR_RE, '')
}
