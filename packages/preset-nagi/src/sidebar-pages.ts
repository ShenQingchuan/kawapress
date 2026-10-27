import type { LocaleConfig } from 'kawapress'
import type { NagiSidebarConfig, SidebarPage, SidebarPages } from './sidebar'
import { readFile } from 'node:fs/promises'
import { resolveLocaleIndex } from 'kawapress'
import { createPageSummaryReader, listMarkdownPages, markdownFileToRoutePath } from 'kawapress/generator'
import { isDocumentPage, resolveConfiguredSidebar } from './sidebar'

/** Where the pages of the site are and which of them a hand-written sidebar shows. */
export interface SidebarPageScope {
  /** Absolute directory holding the Markdown sources. */
  sourceRoot: string
  /** Absolute directory of copied assets, which holds no pages. */
  publicDir?: string | undefined
  /** Site `themeConfig`, as the site config declares it; only `sidebar` is read. */
  themeConfig?: object | undefined
  /** Site locales, whose `themeConfig` can replace the site sidebar. */
  locales?: Record<string, LocaleConfig<object>> | undefined
}

export interface SidebarPageReader {
  /** Every page the automatic sidebar shows, keyed by route path. */
  readAll: () => Promise<SidebarPages>
  /** The entry `readAll` gives for one Markdown file, read from disk. */
  readChanged: (file: string) => Promise<SidebarPage | undefined>
}

/**
 * Reads what the automatic sidebar needs from the page sources: the title, the
 * layout, and whether a hand-written sidebar covers the route. Reading a page
 * never renders it, so no `pageData()` handler and no Markdown plugin runs.
 */
export function createSidebarPageReader(
  getScope: () => SidebarPageScope,
): SidebarPageReader {
  const summaryReader = createPageSummaryReader()

  function readPage(
    scope: SidebarPageScope,
    routePath: string,
    file: string,
    source: string,
  ): SidebarPage | undefined {
    if (isCoveredByConfiguredSidebar(scope, routePath)) {
      return
    }

    const { title, layout } = summaryReader.read(source, file)
    if (!isDocumentPage({ title, layout })) {
      return
    }
    // Only the two fields the sidebar reads, so a richer summary costs nothing.
    return layout === undefined ? { title } : { title, layout }
  }

  return {
    async readAll() {
      const scope = getScope()
      const pages = await listMarkdownPages(scope)
      const entries = await Promise.all(pages.map(async (page) => {
        const source = await readFile(page.file, 'utf8')
        const entry = readPage(scope, page.routePath, page.file, source)
        return entry === undefined ? [] : [[page.routePath, entry] as [string, SidebarPage]]
      }))
      return Object.fromEntries(entries.flat())
    },
    async readChanged(file) {
      const scope = getScope()
      const routePath = markdownFileToRoutePath(file, scope.sourceRoot)
      return readPage(scope, routePath, file, await readFile(file, 'utf8'))
    },
  }
}

/**
 * Whether a hand-written `themeConfig.sidebar` shows this route. Core merges
 * the site themeConfig with the one of the route's locale, the locale winning
 * key by key, so that merged sidebar is the one that decides.
 */
function isCoveredByConfiguredSidebar(
  scope: SidebarPageScope,
  routePath: string,
): boolean {
  const sidebar = resolveSidebar(scope, routePath)
  return resolveConfiguredSidebar(sidebar, routePath) !== undefined
}

function resolveSidebar(
  scope: SidebarPageScope,
  routePath: string,
): NagiSidebarConfig | undefined {
  const locales = scope.locales ?? {}
  const locale = locales[resolveLocaleIndex(routePath, Object.keys(locales))]
  const themeConfig = {
    ...(scope.themeConfig ?? {}),
    ...(locale?.themeConfig ?? {}),
  } as { sidebar?: NagiSidebarConfig }
  return themeConfig.sidebar
}
