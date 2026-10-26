import type { ImageZoomLabels } from './labels'
import { ENGLISH_IMAGE_ZOOM_LABELS } from './labels'

const ZOOMABLE_IMAGE_SELECTOR = 'img[data-kawa-zoom]'
const DIALOG_CLASS = 'kawa-image-zoom'

export interface InstallImageZoomOptions {
  /** Labels of the page the visitor is on, resolved again on every open. */
  resolveLabels: () => ImageZoomLabels
}

export interface CloseImageZoomOptions {
  /** Keep focus where it is instead of returning it to the opening image. */
  restoreFocus?: boolean
}

interface ImageZoomElements {
  dialog: HTMLDialogElement
  image: HTMLImageElement
  caption: HTMLElement
}

let installed = false
let resolveLabels: InstallImageZoomOptions['resolveLabels'] | undefined
let elements: ImageZoomElements | undefined
let opener: HTMLImageElement | undefined

/**
 * Installs one document-level listener pair for the whole site. Delegation
 * keeps images that Markdown rendered, images inside Vue components and images
 * of a page the visitor navigates to later working the same way.
 */
export function installImageZoom(options: InstallImageZoomOptions): void {
  if (installed) {
    return
  }
  installed = true
  resolveLabels = options.resolveLabels
  document.addEventListener('click', handleClick)
  document.addEventListener('keydown', handleKeydown)
}

/**
 * Opens the zoom dialog for one image. The dialog is created on first use and
 * reused afterwards, so opening an image costs one `showModal()` call.
 */
export function openImageZoom(
  source: HTMLImageElement,
  labels: ImageZoomLabels = currentLabels(),
): void {
  const zoom = ensureElements()

  zoom.dialog.setAttribute('aria-label', labels.dialog)
  zoom.image.src = source.currentSrc || source.src
  if (source.srcset) {
    zoom.image.srcset = source.srcset
  }
  else {
    zoom.image.removeAttribute('srcset')
  }
  zoom.image.alt = source.alt
  zoom.caption.textContent = source.alt
  zoom.caption.hidden = source.alt.trim() === ''

  opener = source
  if (!zoom.dialog.open) {
    zoom.dialog.showModal()
  }
}

export function closeImageZoom(options: CloseImageZoomOptions = {}): void {
  const zoom = elements
  if (!zoom?.dialog.open) {
    return
  }
  if (options.restoreFocus === false) {
    opener = undefined
  }
  zoom.dialog.close()
}

function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0 || hasModifier(event)) {
    return
  }
  const image = findZoomableImage(event.target)
  if (!image) {
    return
  }
  // A zoomable image wrapped in a link should zoom instead of navigating.
  event.preventDefault()
  openImageZoom(image)
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return
  }
  const image = findZoomableImage(event.target)
  if (!image) {
    return
  }
  event.preventDefault()
  openImageZoom(image)
}

function hasModifier(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

function findZoomableImage(target: EventTarget | null): HTMLImageElement | null {
  if (!(target instanceof Element)) {
    return null
  }
  return target.closest<HTMLImageElement>(ZOOMABLE_IMAGE_SELECTOR)
}

function currentLabels(): ImageZoomLabels {
  return resolveLabels?.() ?? ENGLISH_IMAGE_ZOOM_LABELS
}

/**
 * Builds the dialog with the native `<dialog>` element, which brings the focus
 * trap, the top layer and Escape handling. A click anywhere and a wheel turn
 * close it, matching how image zoom feels in other documentation sites.
 */
function ensureElements(): ImageZoomElements {
  if (elements) {
    return elements
  }

  const dialog = document.createElement('dialog')
  dialog.className = DIALOG_CLASS

  const figure = document.createElement('figure')
  figure.className = `${DIALOG_CLASS}__figure`

  const image = document.createElement('img')
  image.className = `${DIALOG_CLASS}__image`
  image.alt = ''

  const caption = document.createElement('figcaption')
  caption.className = `${DIALOG_CLASS}__caption`
  caption.hidden = true

  figure.append(image, caption)
  dialog.append(figure)
  dialog.addEventListener('click', () => closeImageZoom())
  dialog.addEventListener('wheel', () => closeImageZoom(), { passive: true })
  dialog.addEventListener('close', restoreOpenerFocus)
  document.body.append(dialog)

  elements = { caption, dialog, image }
  return elements
}

function restoreOpenerFocus(): void {
  const target = opener
  opener = undefined
  if (target?.isConnected) {
    target.focus()
  }
}
