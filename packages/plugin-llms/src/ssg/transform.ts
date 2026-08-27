import type { PageBuildArtifact } from 'kawapress'
import type { MarkdownExit } from 'markdown-exit'
import {
  SSG_MD_MARKERS_ID,
  SSG_MD_RAW_COMPONENT,
  SSG_MD_ROOT_COMPONENT,
} from '../constants'
import { createSsgMarkdownSource } from './source'

interface SsgMarkdownEnv {
  path: string
  sourcePath: string
  ssgMarkdown: true
}

export interface TransformMarkdownSfcOptions {
  artifact: Readonly<PageBuildArtifact>
  code: string
  markdown: MarkdownExit
}

export async function transformMarkdownSfc({
  artifact,
  code,
  markdown,
}: TransformMarkdownSfcOptions): Promise<string> {
  const source = createSsgMarkdownSource(markdown, artifact.source)
  const env: SsgMarkdownEnv = {
    path: artifact.routePath,
    sourcePath: artifact.sourcePath,
    ssgMarkdown: true,
  }
  const html = await markdown.renderAsync(source, env)
  const content = `<${SSG_MD_ROOT_COMPONENT}>${html}</${SSG_MD_ROOT_COMPONENT}>`
  return injectMarkerImports(replaceOuterTemplate(code, content))
}

const MARKER_IMPORTS = `import { SsgMarkdown as ${SSG_MD_RAW_COMPONENT}, SsgMarkdownRoot as ${SSG_MD_ROOT_COMPONENT} } from '${SSG_MD_MARKERS_ID}'`

export function injectMarkerImports(code: string): string {
  const scriptSetup = findScriptSetupOpen(code)
  if (scriptSetup) {
    return code.replace(scriptSetup, `${scriptSetup}\n${MARKER_IMPORTS}`)
  }
  return `${code}\n<script setup>\n${MARKER_IMPORTS}\n</script>`
}

function findScriptSetupOpen(code: string): string | undefined {
  for (const match of code.matchAll(/<script[^>]*>/g)) {
    if (/\ssetup[\s=>]/.test(match[0])) {
      return match[0]
    }
  }
}

export function replaceOuterTemplate(code: string, content: string): string {
  const templateStart = code.indexOf('<template>')
  const firstScript = code.indexOf('\n<script', templateStart)
  const templateEnd = firstScript < 0
    ? -1
    : code.lastIndexOf('</template>', firstScript)
  if (templateStart !== 0 || templateEnd < 0) {
    throw new Error(
      'KawaPress LLMS: expected the Markdown loader to return a Vue SFC with an outer template.',
    )
  }

  return `${code.slice(0, templateStart + '<template>'.length)}${content}${code.slice(templateEnd)}`
}
