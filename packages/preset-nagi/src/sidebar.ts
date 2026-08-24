import type { PageData } from 'kawapress'

export interface SidebarItem {
  text: string
  link?: string
  items?: SidebarItem[]
}

interface SidebarNode {
  segment: string
  text: string
  link?: string
  children: Map<string, SidebarNode>
}

export interface CreateSidebarOptions {
  base?: string
}

export function createSidebar(
  pages: Readonly<Record<string, PageData>>,
  options: CreateSidebarOptions = {},
): SidebarItem[] {
  const rootPages: SidebarItem[] = []
  const root = new Map<string, SidebarNode>()

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

    let siblings = root
    for (const [index, segment] of segments.entries()) {
      const node: SidebarNode = siblings.get(segment) ?? {
        segment,
        text: humanize(segment),
        children: new Map<string, SidebarNode>(),
      }
      siblings.set(segment, node)

      if (index === segments.length - 1) {
        node.link = page.path
        node.text = page.title || node.text
      }
      siblings = node.children
    }
  }

  return [
    ...rootPages,
    ...Array.from(root.values(), toSidebarItem),
  ]
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

function toSidebarItem(node: SidebarNode): SidebarItem {
  const items = Array.from(node.children.values(), toSidebarItem)
  return {
    text: node.text,
    link: node.link,
    items: items.length > 0 ? items : undefined,
  }
}
