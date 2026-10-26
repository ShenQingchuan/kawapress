import type { LastUpdatedRuntimeOptions } from './types'
import { lastUpdatedOptions } from 'virtual:kawapress-last-updated-options'

/**
 * Options the generator side published as JSON. The virtual module is the only
 * connection between the two sides; the runtime never imports generator code.
 */
export const runtimeOptions: LastUpdatedRuntimeOptions = lastUpdatedOptions
