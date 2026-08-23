import type { Plugin } from 'vite'
import type { SiteData } from '../site'

const MODULE_ID = 'virtual:kawapress-site'
const RESOLVED_ID = `\0${MODULE_ID}`

export function virtualSitePlugin(site: SiteData): Plugin {
  return {
    name: 'kawapress:virtual-site',
    resolveId(id) {
      if (id === MODULE_ID) {
        return RESOLVED_ID
      }
    },
    load(id) {
      if (id === RESOLVED_ID) {
        return `export const site = ${JSON.stringify(site)}`
      }
    },
  }
}
