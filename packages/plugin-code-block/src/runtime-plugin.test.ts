// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  installCodeBlockCopyHandler,
  readCodeText,
} from './runtime-plugin'

describe('code block copy runtime', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('copies visible lines, reports success, resets, and rejects a failed fallback', async () => {
    vi.useFakeTimers()
    document.body.innerHTML = `
      <div class="kawa-code-block">
        <button
          class="kawa-code-block__copy"
          aria-label="Copy code"
          title="Copy code"
          data-copy-label="Copy code"
          data-copied-label="Copied"
        ><span class="kawa-code-block__copy-status" aria-live="polite"></span></button>
        <pre><code><span class="line">keep</span>
<span class="line diff remove">remove</span>
<span class="line"><span class="kawa-code-block__copy-ignore">$ </span>second</span></code></pre>
      </div>
    `
    const button = document.querySelector<HTMLButtonElement>('.kawa-code-block__copy')!
    const code = document.querySelector<HTMLElement>('code')!
    const clipboard = {
      writeText: vi.fn<(text: string) => Promise<void>>().mockResolvedValue(),
    }
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: clipboard,
    })
    const execCommand = vi.fn(() => false)
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    })
    installCodeBlockCopyHandler()

    expect(readCodeText(code)).toBe('keep\nsecond')
    button.click()
    await Promise.resolve()
    await Promise.resolve()

    expect(clipboard.writeText).toHaveBeenCalledWith('keep\nsecond')
    expect(button.dataset.copied).toBe('true')
    expect(button.ariaLabel).toBe('Copied')
    expect(button.querySelector('.kawa-code-block__copy-status')?.textContent)
      .toBe('Copied')

    vi.advanceTimersByTime(2000)
    expect(button.dataset.copied).toBeUndefined()
    expect(button.ariaLabel).toBe('Copy code')

    clipboard.writeText.mockRejectedValueOnce(new Error('Denied'))
    button.click()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(execCommand).toHaveBeenCalledOnce()
    expect(button.dataset.copied).toBeUndefined()
    expect(button.ariaLabel).toBe('Copy code')

    let fallbackText = ''
    execCommand.mockImplementationOnce(() => {
      fallbackText = document.querySelector('textarea')?.value ?? ''
      return true
    })
    clipboard.writeText.mockRejectedValueOnce(new Error('Denied'))
    button.focus()
    button.click()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(fallbackText).toBe('keep\nsecond')
    expect(button.dataset.copied).toBe('true')
    expect(document.activeElement).toBe(button)
  })
})
