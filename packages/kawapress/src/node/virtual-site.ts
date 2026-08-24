import type { Plugin } from 'vite'
import type { SiteData } from '../site'
import { stringifyJsonForScript } from '../json'

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
        const serializedSite = stringifyJsonForScript(site, {
          label: 'site data',
          path: 'site',
        })
        return `export const site = ${serializedSite}`
      }
    },
  }
}
