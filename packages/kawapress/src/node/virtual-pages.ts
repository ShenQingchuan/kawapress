import type { Plugin } from 'vite'

const MODULE_ID = 'virtual:kawapress-pages'
const RESOLVED_ID = `\0${MODULE_ID}`

export interface VirtualPagesOptions {
  srcDir: string
}

export function virtualPagesPlugin(options: VirtualPagesOptions): Plugin {
  return {
    name: 'kawapress:virtual-pages',
    resolveId(id) {
      if (id === MODULE_ID) {
        return RESOLVED_ID
      }
    },
    load(id) {
      if (id === RESOLVED_ID) {
        return generatePagesModule(options)
      }
    },
  }
}

function generatePagesModule(options: VirtualPagesOptions): string {
  const prefix = options.srcDir === '.' ? '' : `/${options.srcDir}`
  const globPatterns = [
    `${prefix}/**/*.md`,
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/.*/**',
  ]

  return `
const mdFiles = import.meta.glob(${JSON.stringify(globPatterns)})

function fileToPath(file) {
  const p = file.slice(${JSON.stringify(prefix)}.length).replace(/\\.md$/, '')
  if (p === '/index') return '/'
  return p.endsWith('/index') ? p.slice(0, -'/index'.length) : p
}

export const pages = Object.fromEntries(
  Object.entries(mdFiles).map(([file, loader]) => [fileToPath(file), loader]),
)
`
}
