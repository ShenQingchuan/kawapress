import { defineRuntimePlugin } from 'kawapress'

const COPY_BUTTON_SELECTOR = '.kawa-code-block__copy'
const COPY_IGNORE_SELECTOR = '.kawa-code-block__copy-ignore, .diff.remove'
const copiedTimeouts = new WeakMap<HTMLButtonElement, number>()
let installed = false

export default defineRuntimePlugin({
  name: '@kawapress/plugin-code-block',
  setup(api) {
    api.vueApp(() => {
      if (!import.meta.env.SSR) {
        installCodeBlockCopyHandler()
      }
    })
  },
})

export function installCodeBlockCopyHandler(): void {
  if (installed) {
    return
  }
  installed = true
  document.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }
    const button = target.closest<HTMLButtonElement>(COPY_BUTTON_SELECTOR)
    if (!button) {
      return
    }
    const code = button
      .closest<HTMLElement>('.kawa-code-block')
      ?.querySelector<HTMLElement>('pre code')
    if (!code) {
      return
    }

    void copyText(readCodeText(code))
      .then(() => {
        showCopiedFeedback(button)
      })
      .catch(() => {})
  })
}

export function readCodeText(code: HTMLElement): string {
  const clone = code.cloneNode(true) as HTMLElement
  const lines = [...clone.children]
    .filter(element => element.classList.contains('line'))
  if (lines.length > 0) {
    return lines
      .filter(line => !line.matches(COPY_IGNORE_SELECTOR))
      .map((line) => {
        const copy = line.cloneNode(true) as HTMLElement
        copy.querySelectorAll(COPY_IGNORE_SELECTOR).forEach(node => node.remove())
        return copy.textContent ?? ''
      })
      .join('\n')
  }

  clone.querySelectorAll(COPY_IGNORE_SELECTOR).forEach(node => node.remove())
  return (clone.textContent ?? '').replace(/\n$/, '')
}

function showCopiedFeedback(button: HTMLButtonElement): void {
  const copiedLabel = button.dataset.copiedLabel ?? 'Copied'
  const copyLabel = button.dataset.copyLabel ?? 'Copy code'
  const status = button.querySelector<HTMLElement>('.kawa-code-block__copy-status')

  button.dataset.copied = 'true'
  button.ariaLabel = copiedLabel
  button.title = copiedLabel
  if (status) {
    status.textContent = copiedLabel
  }
  window.clearTimeout(copiedTimeouts.get(button))
  copiedTimeouts.set(button, window.setTimeout(() => {
    delete button.dataset.copied
    button.ariaLabel = copyLabel
    button.title = copyLabel
    if (status) {
      status.textContent = ''
    }
    copiedTimeouts.delete(button)
  }, 2000))
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  }
  catch {
    const textarea = document.createElement('textarea')
    const focused = document.activeElement as HTMLElement | null
    const selection = document.getSelection()
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null

    textarea.value = text
    textarea.readOnly = true
    textarea.style.position = 'fixed'
    textarea.style.inset = '0 auto auto -9999px'
    textarea.style.fontSize = '12pt'
    let copied = false
    try {
      document.body.appendChild(textarea)
      textarea.select()
      textarea.selectionStart = 0
      textarea.selectionEnd = text.length
      copied = document.execCommand('copy')
    }
    finally {
      textarea.remove()
      if (range && selection) {
        selection.removeAllRanges()
        selection.addRange(range)
      }
      focused?.focus()
    }
    if (!copied) {
      throw new Error('Unable to copy code to the clipboard.')
    }
  }
}
