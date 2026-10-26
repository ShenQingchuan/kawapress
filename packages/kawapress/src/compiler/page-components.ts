/**
 * Components that one Markdown page declared while it was rendered.
 *
 * A Markdown plugin says "this page uses this component" from inside a
 * markdown-it rule, fence renderer or highlight callback, which all receive the
 * Markdown `env`. KawaPress merges the import into that page's own Vue SFC, so
 * Vue resolves the tag in the page template, Markdown authors declare nothing,
 * and pages that never produce the tag never download the component module.
 */

/** One component that the template of a page uses. */
export interface PageComponent {
  /**
   * Name of the tag in the page template, for example `AcmeChart` in
   * `<AcmeChart />`. It becomes the import binding of the page SFC, so it must
   * be a valid JavaScript identifier.
   */
  name: string
  /**
   * Module whose default export is the component: a bare package specifier or
   * an absolute file path. Vite resolves it from the page that imports it.
   */
  from: string
}

/** Part of the Markdown `env` that carries the page components. */
export interface PageComponentEnv {
  /** Public route of the page being rendered. Only used in error messages. */
  path?: string
  pageComponents?: PageComponent[]
  /**
   * The Markdown env of markdown-it and markdown-exit carries every value a
   * plugin writes. Accepting that shape here lets a plugin pass the env it
   * receives straight to `addPageComponent()`.
   */
  [key: string]: unknown
}

const COMPONENT_NAME_RE = /^[A-Z_$][\w$]*$/i
const SCRIPT_SETUP_RE = /<\s*script[^>]*\ssetup\b/
const SCRIPT_LANG_RE = /\slang\s*=\s*["']([^"']+)["']/
const SCRIPT_OPEN_RE = /<\s*script[^>]*>/

/**
 * Declares that the page being rendered uses `component`.
 *
 * Call it with the `env` of the rule that produced the tag. Declaring the same
 * name and module twice is harmless, because a page can render a component many
 * times; declaring the same name from two modules is an error.
 */
export function addPageComponent(
  env: PageComponentEnv,
  component: PageComponent,
): void {
  if (typeof env !== 'object' || env === null) {
    throw new Error(
      `KawaPress: addPageComponent() expects the Markdown env of the page being rendered, but received a value of type ${env === null ? 'null' : typeof env}. Call it from a markdown-it rule, fence renderer or highlight callback and pass the env that callback receives.`,
    )
  }

  const page = describePage(env)
  const name: unknown = component?.name
  const from: unknown = component?.from

  if (typeof name !== 'string' || !COMPONENT_NAME_RE.test(name)) {
    throw new Error(
      `KawaPress: the component name ${JSON.stringify(name)} declared on ${page} is not a valid identifier. The name becomes the import binding of the page component, so use the PascalCase form of the tag, for example "AcmeChart" for <AcmeChart />.`,
    )
  }
  if (typeof from !== 'string' || from.length === 0) {
    throw new Error(
      `KawaPress: the component "${name}" declared on ${page} has no module to import from. Pass a bare package specifier such as "@acme/chart" or an absolute file path.`,
    )
  }

  const declared = (env.pageComponents ??= []).find(entry => entry.name === name)
  if (!declared) {
    env.pageComponents.push({ name, from })
    return
  }
  if (declared.from === from) {
    return
  }

  throw new Error(
    `KawaPress: ${page} declares the component "${name}" from two modules: ${JSON.stringify(declared.from)} and ${JSON.stringify(from)}. One component name can come from one module per page; rename one of them, or declare it only where that page needs it.`,
  )
}

function describePage(env: PageComponentEnv): string {
  return typeof env.path === 'string'
    ? `route ${JSON.stringify(env.path)}`
    : 'a page without a route'
}

/**
 * Merges the declared components into the scripts of the page SFC.
 *
 * Imports always land in a `<script setup>` block, so the page template resolves
 * them as local bindings: an existing setup block is reused, a page with only a
 * plain `<script>` gets a setup block with the same `lang`, and a page without
 * any script gets one too. The returned array is new; the input is untouched.
 */
export function injectPageComponentImports(
  scripts: string[],
  components: readonly PageComponent[],
): string[] {
  if (components.length === 0) {
    return scripts
  }

  const imports = components
    .map(component => `import ${component.name} from ${JSON.stringify(component.from)}`)
    .join('\n')
  const setupIndex = scripts.findIndex(isScriptSetupBlock)
  if (setupIndex >= 0) {
    return scripts.map((script, index) => (
      index === setupIndex ? insertAfterScriptTag(script, imports) : script
    ))
  }

  const lang = scripts.map(readScriptLang).find(value => value !== undefined)
  const langAttribute = lang ? ` lang=${JSON.stringify(lang)}` : ''
  return [`<script setup${langAttribute}>\n${imports}\n</script>`, ...scripts]
}

/** Whether a script block is `<script setup>`, whatever its `lang` is. */
export function isScriptSetupBlock(script: string): boolean {
  return SCRIPT_SETUP_RE.test(script)
}

/** `lang` attribute of a script block, for example `ts`. */
export function readScriptLang(script: string): string | undefined {
  return SCRIPT_LANG_RE.exec(script)?.[1]
}

function insertAfterScriptTag(script: string, code: string): string {
  const match = SCRIPT_OPEN_RE.exec(script)
  if (!match) {
    return script
  }
  const index = match.index + match[0].length
  return `${script.slice(0, index)}\n${code}${script.slice(index)}`
}
