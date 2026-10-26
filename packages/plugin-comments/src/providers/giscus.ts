import type { ResolvedGiscusOptions } from '../options'
import type {
  CommentsAppearance,
  CommentsProvider,
  CommentsThreadContext,
} from '../provider'

export const GISCUS_SCRIPT_URL = 'https://giscus.app/client.js'

const GISCUS_ORIGIN = 'https://giscus.app'

const CHINESE_GISCUS_LANG = 'zh-CN'
const FALLBACK_GISCUS_LANG = 'en'

/**
 * giscus ships its own interface translations, so the site language is mapped
 * to the closest supported one instead of forwarding arbitrary values.
 */
export function resolveGiscusLang(lang: string | undefined): string {
  return (lang ?? '').toLowerCase().startsWith('zh')
    ? CHINESE_GISCUS_LANG
    : FALLBACK_GISCUS_LANG
}

/**
 * Creates comment threads with the official giscus client script. Every thread
 * derives its discussion from the live URL and page title, which is why the
 * component rebuilds the thread after a route change instead of reusing it.
 */
export function createGiscusProvider(
  options: ResolvedGiscusOptions,
): CommentsProvider {
  return {
    create(container, context) {
      const script = createGiscusScript(options, context)
      container.append(script)

      return {
        setAppearance(appearance) {
          script.dataset.theme = appearance
          sendGiscusTheme(container, appearance)
        },
        destroy() {
          script.remove()
          container.replaceChildren()
        },
      }
    },
  }
}

function createGiscusScript(
  options: ResolvedGiscusOptions,
  context: CommentsThreadContext,
): HTMLScriptElement {
  const script = document.createElement('script')
  script.src = GISCUS_SCRIPT_URL
  script.async = true
  script.crossOrigin = 'anonymous'
  setGiscusData(script, {
    repo: options.repo,
    repoId: options.repoId,
    category: options.category,
    categoryId: options.categoryId,
    mapping: options.mapping,
    strict: options.strict ? '1' : '0',
    reactionsEnabled: options.reactionsEnabled ? '1' : '0',
    inputPosition: options.inputPosition,
    theme: context.appearance,
    lang: context.lang,
    loading: options.loading,
  })
  return script
}

function setGiscusData(
  script: HTMLScriptElement,
  attributes: Record<string, string>,
): void {
  for (const [name, value] of Object.entries(attributes)) {
    script.dataset[name] = value
  }
}

/**
 * giscus has no JavaScript API; the official way to change a live thread is a
 * `postMessage` to the iframe it rendered next to our script.
 */
function sendGiscusTheme(
  container: HTMLElement,
  theme: CommentsAppearance,
): void {
  const frame = container.querySelector<HTMLIFrameElement>('iframe.giscus-frame')
  frame?.contentWindow?.postMessage(
    { giscus: { setConfig: { theme } } },
    GISCUS_ORIGIN,
  )
}
