import type { ResolvedCommentsOptions } from './options'
import options from 'virtual:kawapress-comments-options'

/**
 * Site options as the generator published them. The runtime reads them here so
 * no module on the browser side imports the generator half of this package.
 */
const resolvedOptions: ResolvedCommentsOptions = options

export default resolvedOptions
