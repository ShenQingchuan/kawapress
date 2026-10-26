// @vitest-environment happy-dom

import type { ImageZoomLabels } from './labels'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

const ENGLISH_LABELS: ImageZoomLabels = {
  zoom: 'Zoom image: {alt}',
  dialog: 'Image zoom',
}

const CHINESE_LABELS: ImageZoomLabels = {
  zoom: '放大图片：{alt}',
  dialog: '图片缩放',
}

let runtime: typeof import('./zoom-runtime')
let labels = ENGLISH_LABELS
const resolveLabels = vi.fn(() => labels)

beforeAll(async () => {
  runtime = await import('./zoom-runtime')
  runtime.installImageZoom({ resolveLabels })
})

afterEach(() => {
  runtime.closeImageZoom({ restoreFocus: false })
  labels = ENGLISH_LABELS
  resolveLabels.mockClear()
  document.querySelectorAll('img:not(.kawa-image-zoom__image)').forEach(image => image.remove())
})

describe('image zoom runtime', () => {
  it('opens a native dialog from a click and returns focus on close', () => {
    const image = createZoomableImage({ alt: 'Diagram', src: '/diagram.png' })
    image.focus()

    image.click()

    const dialog = getDialog()
    const zoomed = dialog.querySelector<HTMLImageElement>('.kawa-image-zoom__image')!
    expect(resolveLabels).toHaveBeenCalledOnce()
    expect(dialog.open).toBe(true)
    expect(dialog.getAttribute('aria-label')).toBe('Image zoom')
    expect(zoomed.getAttribute('src')).toBe(image.src)
    expect(zoomed.alt).toBe('Diagram')
    expect(dialog.querySelector('.kawa-image-zoom__caption')?.textContent).toBe('Diagram')
    expect(dialog.querySelector<HTMLElement>('.kawa-image-zoom__caption')?.hidden).toBe(false)

    dialog.close()

    expect(dialog.open).toBe(false)
    expect(document.activeElement).toBe(image)
  })

  it('opens from the keyboard with Enter and with Space', () => {
    const image = createZoomableImage({ alt: 'Diagram', src: '/diagram.png' })
    image.focus()

    image.dispatchEvent(createKeydown('Enter'))
    expect(getDialog().open).toBe(true)
    runtime.closeImageZoom()
    expect(getDialog().open).toBe(false)

    image.dispatchEvent(createKeydown(' '))
    expect(getDialog().open).toBe(true)
  })

  it('resolves labels again on every open and hides an empty caption', () => {
    const image = createZoomableImage({ alt: '', src: '/no-alt.png' })
    image.click()

    const dialog = getDialog()
    expect(dialog.getAttribute('aria-label')).toBe('Image zoom')
    expect(dialog.querySelector<HTMLElement>('.kawa-image-zoom__caption')?.hidden).toBe(true)

    runtime.closeImageZoom()
    labels = CHINESE_LABELS
    image.click()

    expect(dialog.getAttribute('aria-label')).toBe('图片缩放')
  })

  it('closes on a click anywhere in the dialog and on a wheel turn', () => {
    const image = createZoomableImage({ alt: 'Diagram', src: '/diagram.png' })
    image.click()

    const dialog = getDialog()
    dialog.querySelector('.kawa-image-zoom__figure')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(dialog.open).toBe(false)

    image.click()
    expect(dialog.open).toBe(true)
    dialog.dispatchEvent(new WheelEvent('wheel'))
    expect(dialog.open).toBe(false)
  })

  it('stays out of the way for modified clicks and untouched images', () => {
    const image = createZoomableImage({ alt: 'Diagram', src: '/diagram.png' })
    image.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }))
    expect(getDialog().open).toBe(false)

    const plain = document.createElement('img')
    plain.src = '/plain.png'
    document.body.append(plain)
    plain.click()
    expect(getDialog().open).toBe(false)
  })

  it('keeps focus where it is when a route change closes the dialog', () => {
    const image = createZoomableImage({ alt: 'Diagram', src: '/diagram.png' })
    const link = document.createElement('a')
    link.href = '/elsewhere'
    link.textContent = 'Elsewhere'
    document.body.append(link)
    link.focus()

    image.click()
    expect(getDialog().open).toBe(true)

    runtime.closeImageZoom({ restoreFocus: false })

    expect(getDialog().open).toBe(false)
    expect(document.activeElement).toBe(link)
    link.remove()
  })
})

function createZoomableImage(options: { alt: string, src: string }): HTMLImageElement {
  const image = document.createElement('img')
  image.alt = options.alt
  image.src = options.src
  image.setAttribute('data-kawa-zoom', '')
  image.setAttribute('role', 'button')
  image.setAttribute('tabindex', '0')
  document.body.append(image)
  return image
}

function createKeydown(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
}

function getDialog(): HTMLDialogElement {
  const dialog = document.querySelector<HTMLDialogElement>('dialog.kawa-image-zoom')
  if (!dialog) {
    throw new Error('Expected the image zoom dialog to exist.')
  }
  return dialog
}
