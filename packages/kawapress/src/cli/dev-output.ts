import type { Logger } from 'vite'
import { styleText } from 'node:util'
import { createLogger } from 'vite'

const logger = createLogger('info', {
  allowClearScreen: false,
  prefix: '[kawapress]',
})

export interface DevServerReadyOutput {
  durationMs: number
  port: number
}

export function formatStartupDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new RangeError('KawaPress: startup duration must be a finite, non-negative number.')
  }

  const milliseconds = Math.round(durationMs)
  if (milliseconds < 1000) {
    return `${milliseconds} ms`
  }

  const seconds = (milliseconds / 1000)
    .toFixed(3)
    .replace(/\.?0+$/, '')
  return `${seconds} s`
}

export function logDevServerReady(
  output: DevServerReadyOutput,
  target: Pick<Logger, 'info'> = logger,
): void {
  const duration = styleText('green', formatStartupDuration(output.durationMs))
  const arrow = styleText('green', '➜')
  const url = styleText('cyan', `http://localhost:${output.port}/`)

  target.info(`dev server ready in ${duration}`, { timestamp: true })
  target.info(`${arrow} Local: ${url}`, { timestamp: true })
}
