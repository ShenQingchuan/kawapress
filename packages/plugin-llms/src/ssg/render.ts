import type { PageBuildArtifact } from 'kawapress'
import type { RenderedPage } from '../artifacts'
import { renderHtmlToMarkdown } from './html-to-markdown'

export interface SsgMarkdownBundle {
  render: (routePath: string) => Promise<{
    html: string
    found: boolean
  }>
}

export async function renderMarkdownPages(
  bundle: SsgMarkdownBundle,
  pages: readonly PageBuildArtifact[],
): Promise<RenderedPage[]> {
  const output: RenderedPage[] = []
  for (const page of pages) {
    if (page.pageData.frontmatter.llms === false) {
      continue
    }

    try {
      const rendered = await bundle.render(page.routePath)
      if (!rendered.found) {
        throw new Error('the page router returned not found')
      }
      output.push({
        routePath: page.routePath,
        sourcePath: page.sourcePath,
        pageData: page.pageData,
        markdown: renderHtmlToMarkdown(rendered.html),
      })
    }
    catch (error) {
      throw new Error(
        `KawaPress LLMS: failed to render Markdown for route ${JSON.stringify(page.routePath)}.`,
        { cause: error },
      )
    }
  }
  return output
}
