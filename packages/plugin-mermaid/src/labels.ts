import { resolveLocaleIndex } from 'kawapress'

/** Visible and accessible texts of one diagram block. */
export interface MermaidLabels {
  /** Accessible name of the view switch. */
  views: string
  /** Button that shows only the rendered diagram. */
  diagram: string
  /** Button that shows only the Mermaid source. */
  code: string
  /** Button that shows the diagram and the source next to each other. */
  split: string
  /** Accessible name of the draggable divider of the side-by-side view. */
  resize: string
  /** Accessible names of the zoom buttons that Pele draws. */
  zoomIn: string
  zoomOut: string
  reset: string
}

export interface MermaidLabelOptions {
  /** Override default labels for every locale. */
  labels?: Partial<MermaidLabels>
  /** Override default labels for one KawaPress locale key. */
  localeLabels?: Record<string, Partial<MermaidLabels>>
}

export const ENGLISH_MERMAID_LABELS: MermaidLabels = {
  views: 'Diagram view',
  diagram: 'Diagram',
  code: 'Code',
  split: 'Side by side',
  resize: 'Resize the diagram and code panes',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  reset: 'Reset zoom',
}

export const CHINESE_MERMAID_LABELS: MermaidLabels = {
  views: '视图模式',
  diagram: '图像',
  code: '代码',
  split: '并排',
  resize: '调整图像与代码的宽度',
  zoomIn: '放大',
  zoomOut: '缩小',
  reset: '重置缩放',
}

/** Language of every locale key, e.g. `{ root: 'zh-CN', en: 'en' }`. */
export type MermaidLocaleLanguages = Record<string, string | undefined>

/** Picks the labels of the page at `path`: built-in texts, then the user's overrides. */
export function resolveMermaidLabels(
  path: string,
  localeLanguages: MermaidLocaleLanguages,
  options: MermaidLabelOptions,
): MermaidLabels {
  const localeIndex = resolveLocaleIndex(path, Object.keys(localeLanguages))
  const builtIn = localeLanguages[localeIndex]?.toLowerCase().startsWith('zh')
    ? CHINESE_MERMAID_LABELS
    : ENGLISH_MERMAID_LABELS

  return {
    ...builtIn,
    ...options.labels,
    ...options.localeLabels?.[localeIndex],
  }
}
