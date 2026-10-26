import type { InlineConfig } from 'vite'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveSiteConfig } from '../config'
import { createBaseViteConfig } from './config'

const HYDRATION_DETAILS_FLAG = '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__'
const initialE2eFlag = process.env.KAWAPRESS_E2E

afterEach(() => {
  restoreE2eFlag()
})

function restoreE2eFlag(): void {
  if (initialE2eFlag === undefined) {
    delete process.env.KAWAPRESS_E2E
    return
  }
  process.env.KAWAPRESS_E2E = initialE2eFlag
}

async function createBaseConfig(): Promise<InlineConfig> {
  const siteConfig = await resolveSiteConfig({})
  return createBaseViteConfig(process.cwd(), siteConfig)
}

describe('createBaseViteConfig define overrides', () => {
  it('leaves Vue build flags untouched for a user site', async () => {
    delete process.env.KAWAPRESS_E2E

    const config = await createBaseConfig()

    expect(config.define?.[HYDRATION_DETAILS_FLAG]).toBeUndefined()
  })

  it('keeps Vue hydration mismatch details when the E2E flag is on', async () => {
    process.env.KAWAPRESS_E2E = '1'

    const config = await createBaseConfig()

    expect(config.define).toEqual({ [HYDRATION_DETAILS_FLAG]: 'true' })
  })

  it('ignores any other value of the E2E flag', async () => {
    process.env.KAWAPRESS_E2E = 'true'

    const config = await createBaseConfig()

    expect(config.define?.[HYDRATION_DETAILS_FLAG]).toBeUndefined()
  })
})
