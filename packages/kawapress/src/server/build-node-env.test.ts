import { describe, expect, it } from 'vitest'
import { BUILD_NODE_ENV, ensureProductionNodeEnv } from './build-node-env'

describe('ensureProductionNodeEnv', () => {
  it('fills in production when the caller did not set NODE_ENV', () => {
    const env: Record<string, string | undefined> = {}

    expect(ensureProductionNodeEnv(env)).toEqual({
      previous: undefined,
      replaced: true,
    })
    expect(env.NODE_ENV).toBe('production')
  })

  it('keeps production untouched when the caller already asked for it', () => {
    const env = { NODE_ENV: 'production' }

    expect(ensureProductionNodeEnv(env)).toEqual({
      previous: 'production',
      replaced: false,
    })
    expect(env.NODE_ENV).toBe(BUILD_NODE_ENV)
  })

  it('forces production over an inherited development value', () => {
    const env = { NODE_ENV: 'development' }

    expect(ensureProductionNodeEnv(env)).toEqual({
      previous: 'development',
      replaced: true,
    })
    expect(env.NODE_ENV).toBe('production')
  })

  it('forces production over the "test" value test runners export', () => {
    const env = { NODE_ENV: 'test' }

    expect(ensureProductionNodeEnv(env).previous).toBe('test')
    expect(env.NODE_ENV).toBe('production')
  })

  it('leaves every other variable alone', () => {
    const env = { HOME: '/home/user', NODE_ENV: undefined }

    ensureProductionNodeEnv(env)

    expect(env).toEqual({ HOME: '/home/user', NODE_ENV: 'production' })
  })
})
