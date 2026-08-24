import type { PageData } from 'kawapress'

export interface NagiSidebarItem {
  text: string
  link?: string
  base?: string
  items?: NagiSidebarItem[]
}

export interface NagiSidebarSection {
  base?: string
  items: NagiSidebarItem[]
}

export type NagiSidebarConfig
  = NagiSidebarItem[]
    | Record<string, NagiSidebarItem[] | NagiSidebarSection>

export type LocalizedSidebarText<Locale extends string>
  = string | Record<Locale, string>

export type LocalizedSidebarItem<Locale extends string>
  = Omit<NagiSidebarItem, 'text' | 'items'> & {
    text: LocalizedSidebarText<Locale>
    items?: LocalizedSidebarItem<Locale>[]
  }

export interface DefineLocalizedSidebarsOptions<Locale extends string> {
  locales: Record<Locale, string>
  items: LocalizedSidebarItem<Locale>[]
}

export type SidebarItem = NagiSidebarItem

export interface SidebarMetaEntry {
  type: 'file' | 'dir'
  name: string
  label?: string
}

export type SidebarMetaItem = string | SidebarMetaEntry
export type SidebarMeta = Readonly<Record<string, SidebarMetaItem[]>>

interface SidebarNode {
  segment: string
  path: string
  text: string
  link?: string
  children: Map<string, SidebarNode>
}

export interface CreateSidebarOptions {
  base?: string
  meta?: SidebarMeta
}

export interface NagiSidebarPageLink {
  text: string
  link: string
}

export interface NagiSidebarNavigation {
  previous?: NagiSidebarPageLink
  next?: NagiSidebarPageLink
}

export function defineLocalizedSidebars<const Locale extends string>(
  options: DefineLocalizedSidebarsOptions<Locale>,
): Record<Locale, NagiSidebarItem[]> {
  return Object.fromEntries(
    Object.entries<string>(options.locales).map(([locale, prefix]) => [
      locale,
      localizeSidebarItems(
        options.items,
        locale as Locale,
        normalizeLocalePrefix(prefix),
      ),
    ]),
  ) as Record<Locale, NagiSidebarItem[]>
}

export function resolveConfiguredSidebar(
  config: NagiSidebarConfig | undefined,
  path: string,
): NagiSidebarItem[] | undefined {
  if (!config || Array.isArray(config)) {
    return config
  }

  const prefix = Object.keys(config)
    .filter(key => matchesRoutePrefix(path, key))
    .sort((a, b) => b.length - a.length)[0]
  if (!prefix) {
    return
  }

  const section = config[prefix]
  return Array.isArray(section)
    ? section
    : applySidebarBase(section.items, section.base)
}

export function findSidebarNavigation(
  items: NagiSidebarItem[],
  currentPath: string,
): NagiSidebarNavigation {
  const pages = collectSidebarPageLinks(items)
  const current = pages.findIndex(
    page => normalizePageRoute(page.link) === normalizePageRoute(currentPath),
  )
  if (current < 0) {
    return {}
  }

  const navigation: NagiSidebarNavigation = {}
  if (current > 0) {
    navigation.previous = pages[current - 1]
  }
  if (current < pages.length - 1) {
    navigation.next = pages[current + 1]
  }
  return navigation
}

export function createSidebar(
  pages: Readonly<Record<string, PageData>>,
  options: CreateSidebarOptions = {},
): SidebarItem[] {
  const rootPages: SidebarItem[] = []
  const root = new Map<string, SidebarNode>()
  const base = normalizeDirectoryPath(options.base ?? '')

  for (const page of Object.values(pages).sort(comparePages)) {
    if (!isDocumentPage(page)) {
      continue
    }

    const relativePath = options.base && page.path.startsWith(options.base)
      ? page.path.slice(options.base.length)
      : page.path
    const segments = relativePath.split('/').filter(Boolean)
    if (segments.length === 0) {
      rootPages.push({
        text: page.title || 'Home',
        link: page.path,
      })
      continue
    }

    let parentPath = base
    let siblings = root
    for (const [index, segment] of segments.entries()) {
      const path = joinDirectoryPath(parentPath, segment)
      const node: SidebarNode = siblings.get(segment) ?? {
        segment,
        path,
        text: humanize(segment),
        children: new Map<string, SidebarNode>(),
      }
      siblings.set(segment, node)

      if (index === segments.length - 1) {
        node.link = page.path
        node.text = page.title || node.text
      }
      parentPath = path
      siblings = node.children
    }
  }

  return [
    ...rootPages,
    ...toSidebarItems(root, base, options.meta ?? {}),
  ]
}

function collectSidebarPageLinks(
  items: NagiSidebarItem[],
): NagiSidebarPageLink[] {
  return items.flatMap((item) => {
    const links: NagiSidebarPageLink[] = []
    if (item.link && isInternalPageRoute(item.link)) {
      links.push({ text: item.text, link: item.link })
    }
    if (item.items) {
      links.push(...collectSidebarPageLinks(item.items))
    }
    return links
  })
}

function isInternalPageRoute(link: string): boolean {
  return link.startsWith('/') && !link.startsWith('//')
}

function normalizePageRoute(path: string): string {
  const route = path.split(/[?#]/, 1)[0]
  return route.length > 1 ? route.replace(/\/$/, '') : route
}

function localizeSidebarItems<Locale extends string>(
  items: LocalizedSidebarItem<Locale>[],
  locale: Locale,
  prefix: string,
): NagiSidebarItem[] {
  return items.map((item) => {
    const localized: NagiSidebarItem = {
      text: typeof item.text === 'string' ? item.text : item.text[locale],
    }
    if (item.link !== undefined) {
      localized.link = prefixSidebarRoute(item.link, prefix)
    }
    if (item.base !== undefined) {
      localized.base = prefixSidebarRoute(item.base, prefix)
    }
    if (item.items !== undefined) {
      localized.items = localizeSidebarItems(item.items, locale, prefix)
    }
    return localized
  })
}

function prefixSidebarRoute(route: string, prefix: string): string {
  if (!prefix || route.startsWith('#') || /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(route)) {
    return route
  }
  if (route === prefix || route.startsWith(`${prefix}/`)) {
    return route
  }
  return route.startsWith('/') ? `${prefix}${route}` : route
}

function normalizeLocalePrefix(prefix: string): string {
  return prefix ? `/${prefix.split('/').filter(Boolean).join('/')}` : ''
}

function matchesRoutePrefix(path: string, prefix: string): boolean {
  const normalized = normalizeDirectoryPath(prefix)
  return normalized === '/'
    || path === normalized
    || path.startsWith(`${normalized}/`)
}

function applySidebarBase(
  items: NagiSidebarItem[],
  inheritedBase?: string,
): NagiSidebarItem[] {
  return items.map((item) => {
    const base = item.base ?? inheritedBase
    const resolved: NagiSidebarItem = { text: item.text }
    if (item.link !== undefined) {
      resolved.link = base ? withSidebarBase(item.link, base) : item.link
    }
    if (item.base !== undefined) {
      resolved.base = item.base
    }
    if (item.items !== undefined) {
      resolved.items = applySidebarBase(item.items, base)
    }
    return resolved
  })
}

function withSidebarBase(link: string, base: string): string {
  if (link.startsWith('/') || link.startsWith('#') || /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(link)) {
    return link
  }
  const normalizedBase = normalizeDirectoryPath(base)
  return normalizedBase === '/' ? `/${link}` : `${normalizedBase}/${link}`
}

function isDocumentPage(page: PageData): boolean {
  const layout = page.frontmatter.layout
  return layout !== 'home' && layout !== 'page'
}

function comparePages(a: PageData, b: PageData): number {
  return a.path.localeCompare(b.path)
}

function humanize(segment: string): string {
  const text = segment.replace(/[-_]+/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function toSidebarItems(
  nodes: Map<string, SidebarNode>,
  directoryPath: string,
  meta: SidebarMeta,
): SidebarItem[] {
  const directoryMeta = meta[directoryPath || '/'] ?? []
  const order = new Map(directoryMeta.map((item, index) => [
    getMetaName(item),
    index,
  ]))

  return Array.from(nodes.values())
    .sort((a, b) => {
      const aOrder = order.get(a.segment) ?? Number.POSITIVE_INFINITY
      const bOrder = order.get(b.segment) ?? Number.POSITIVE_INFINITY
      return aOrder - bOrder || a.segment.localeCompare(b.segment)
    })
    .map((node) => {
      const configured = directoryMeta.find(
        item => getMetaName(item) === node.segment,
      )
      const items = toSidebarItems(node.children, node.path, meta)
      return {
        text: typeof configured === 'object' && configured.label
          ? configured.label
          : node.text,
        link: node.link,
        items: items.length > 0 ? items : undefined,
      }
    })
}

function getMetaName(item: SidebarMetaItem): string {
  const name = typeof item === 'string' ? item : item.name
  return name.replace(/\.md$/, '')
}

function normalizeDirectoryPath(path: string): string {
  if (!path || path === '/') {
    return '/'
  }
  return `/${path.split('/').filter(Boolean).join('/')}`
}

function joinDirectoryPath(parent: string, segment: string): string {
  return parent === '/' ? `/${segment}` : `${parent}/${segment}`
}
