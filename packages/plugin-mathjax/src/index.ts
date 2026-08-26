import type {
  MarkdownItMathjaxOptions,
  MathjaxInstance,
  TexPackage,
} from '@mdit/plugin-mathjax'
import type { KawaPressPlugin } from 'kawapress'
import type { MarkdownExit } from 'markdown-exit'
import { createMathjaxInstance, mathjax } from '@mdit/plugin-mathjax/sync'
import { definePlugin, useMarkdownItPlugin } from 'kawapress'
import { createMarkdownExit } from 'markdown-exit'

export type MathJaxMacro = string
  | [definition: string, argumentCount: number]
  | [definition: string, argumentCount: number, defaultValue: string]

export interface MathJaxTexOptions extends NonNullable<
  MarkdownItMathjaxOptions['tex']
> {
  macros?: Record<string, MathJaxMacro>
}

export type MathJaxSvgOptions = Pick<
  NonNullable<MarkdownItMathjaxOptions['svg']>,
  | 'exFactor'
  | 'mathmlSpacing'
  | 'merrorFont'
  | 'merrorInheritFont'
  | 'minScale'
  | 'mtextFont'
  | 'mtextInheritFont'
  | 'scale'
  | 'unknownFamily'
>

export interface MathJaxPluginOptions {
  tex?: MathJaxTexOptions
  svg?: MathJaxSvgOptions
}

const STATIC_TEX_PACKAGES = [
  'ams',
  'amscd',
  'bbm',
  'bboldx',
  'bbox',
  'begingroup',
  'boldsymbol',
  'braket',
  'bussproofs',
  'cancel',
  'cases',
  'centernot',
  'color',
  'colortbl',
  'colorv2',
  'configmacros',
  'dsfont',
  'empheq',
  'enclose',
  'extpfeil',
  'gensymb',
  'html',
  'mathtools',
  'mhchem',
  'newcommand',
  'noerrors',
  'noundefined',
  'physics',
  'setoptions',
  'tagformat',
  'texhtml',
  'textcomp',
  'textmacros',
  'unicode',
  'units',
  'upgreek',
  'verb',
] as const satisfies readonly TexPackage[]

type MathKind = 'inline' | 'block'
type MathRenderer = NonNullable<
  MarkdownExit['renderer']['rules']['math_inline']
>

interface MathRenderers {
  inline: MathRenderer
  block: MathRenderer
}

export function mathjaxPlugin(
  options: MathJaxPluginOptions = {},
): KawaPressPlugin {
  return definePlugin({
    name: '@kawapress/plugin-mathjax',
    setup(api) {
      api.markdown((markdown) => {
        installMathJax(markdown, options)
      })
    },
  })
}

export default mathjaxPlugin

export function installMathJax(
  markdown: MarkdownExit,
  options: MathJaxPluginOptions = {},
): void {
  const initialInstance = createInstance(options)
  useMarkdownItPlugin(markdown, mathjax, initialInstance)

  let initialRenderers: MathRenderers | undefined = readMathRenderers(markdown)
  const renderersByPage = new WeakMap<object, MathRenderers>()

  const getRenderers = (tokens: object, env: unknown): MathRenderers => {
    const page = isObject(env) ? env : tokens
    let renderers = renderersByPage.get(page)
    if (!renderers) {
      renderers = initialRenderers ?? createMathRenderers(options)
      initialRenderers = undefined
      renderersByPage.set(page, renderers)
    }
    return renderers
  }

  markdown.renderer.rules.math_inline = (...args) => {
    const renderers = getRenderers(args[0], args[3])
    return renderMath(renderers.inline, args, 'inline')
  }
  markdown.renderer.rules.math_block = (...args) => {
    const renderers = getRenderers(args[0], args[3])
    return renderMath(renderers.block, args, 'block')
  }
}

function createInstance(options: MathJaxPluginOptions): MathjaxInstance {
  if (options.tex?.packages?.includes('action')) {
    throw new Error(
      'MathJax interactive action macros are not supported by static rendering. Remove "action" from tex.packages.',
    )
  }
  const packages = options.tex?.packages ?? STATIC_TEX_PACKAGES
  const syncInstance = createMathjaxInstance({
    a11y: true,
    output: 'svg',
    tex: {
      ...options.tex,
      // @mdit's public union omits MathJax's required built-in `base` package.
      packages: ['base', ...packages] as TexPackage[],
    },
    svg: {
      ...options.svg,
      fontCache: 'none',
      linebreaks: {
        inline: false,
      },
    },
  })
  if (!syncInstance) {
    throw new Error('MathJax could not create its SVG renderer.')
  }
  return {
    ...syncInstance,
    outputStyle: async () => syncInstance.outputStyle(),
  }
}

function createMathRenderers(options: MathJaxPluginOptions): MathRenderers {
  const markdown = createMarkdownExit({ html: true })
  useMarkdownItPlugin(markdown, mathjax, createInstance(options))
  return readMathRenderers(markdown)
}

function readMathRenderers(markdown: MarkdownExit): MathRenderers {
  const inline = markdown.renderer.rules.math_inline
  const block = markdown.renderer.rules.math_block
  if (!inline || !block) {
    throw new Error('MathJax did not install its Markdown renderer rules.')
  }
  return { block, inline }
}

function renderMath(
  renderer: MathRenderer,
  args: Parameters<MathRenderer>,
  kind: MathKind,
): ReturnType<MathRenderer> {
  const rendered = renderer(...args)
  return typeof rendered === 'string'
    ? decorateMathContainer(rendered, kind)
    : rendered.then(html => decorateMathContainer(html, kind))
}

function isObject(value: unknown): value is object {
  return value !== null && (typeof value === 'object' || typeof value === 'function')
}

function decorateMathContainer(html: string, kind: MathKind): string {
  const attributes = kind === 'block'
    ? ' v-pre data-kawa-math="block" tabindex="0"'
    : ' v-pre data-kawa-math="inline"'
  const decorated = html.replace(
    /^<mjx-container(?=[\s>])/,
    `<mjx-container${attributes}`,
  )
  if (decorated === html) {
    throw new Error('MathJax returned an unexpected root element.')
  }
  return decorated
}
