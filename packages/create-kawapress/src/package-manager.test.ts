import { describe, expect, it } from 'vitest'
import { detectPackageManager, installCommand, isPackageManager, runCommand } from './package-manager'

describe('detectPackageManager', () => {
  it('reads the package manager from the user agent', () => {
    expect(detectPackageManager('pnpm/11.22.0 npm/? node/v26.10.0 darwin arm64')).toBe('pnpm')
    expect(detectPackageManager('yarn/1.22.22 npm/? node/v22.12.0 darwin arm64')).toBe('yarn')
    expect(detectPackageManager('bun/1.2.0 npm/? node/v23.0.0 darwin arm64')).toBe('bun')
    expect(detectPackageManager('npm/10.9.2 node/v22.12.0 darwin arm64 workspaces/false')).toBe('npm')
  })

  it('prefers pnpm over the npm token npm always appends', () => {
    expect(detectPackageManager('pnpm/11.22.0 npm/? node/v26.10.0')).toBe('pnpm')
  })

  it('falls back to npm when the agent is empty or unknown', () => {
    expect(detectPackageManager('')).toBe('npm')
    expect(detectPackageManager('deno/2.0.0')).toBe('npm')
    expect(detectPackageManager()).toBe('npm')
  })
})

describe('package manager commands', () => {
  it('builds install and run commands', () => {
    expect(installCommand('pnpm')).toBe('pnpm install')
    expect(runCommand('npm', 'dev')).toBe('npm run dev')
    expect(runCommand('bun', 'dev')).toBe('bun run dev')
  })
})

describe('isPackageManager', () => {
  it('accepts the supported managers only', () => {
    expect(isPackageManager('yarn')).toBe(true)
    expect(isPackageManager('deno')).toBe(false)
  })
})
