/** Discussion key giscus uses to find the thread of a page. */
export type GiscusMapping
  = | 'pathname'
    | 'url'
    | 'title'
    | 'og:title'
    | 'specific'
    | 'number'

export type GiscusInputPosition = 'top' | 'bottom'

export type GiscusLoading = 'lazy' | 'eager'

/** Heading text of the comment section. */
export interface CommentsLabels {
  heading: string
}

export interface GiscusOptions {
  /** GitHub repository that hosts the discussions, `owner/name`. */
  repo: string
  /** `data-repo-id` from the snippet on giscus.app. */
  repoId: string
  /** Discussion category name. */
  category: string
  /** `data-category-id` from the snippet on giscus.app. */
  categoryId: string
  /** How a page is matched to a discussion. */
  mapping?: GiscusMapping
  /** Only match discussions whose title exactly equals the mapping term. */
  strict?: boolean
  /** Show the reaction bar above the comment box. */
  reactionsEnabled?: boolean
  /** Place the comment box above or below the thread. */
  inputPosition?: GiscusInputPosition
  /** Lazy loading of the giscus iframe: use `lazy` inside long pages. */
  loading?: GiscusLoading
}

export interface CommentsPluginOptions {
  giscus: GiscusOptions
  /** Override the section heading for every locale. */
  labels?: Partial<CommentsLabels>
  /** Override the section heading for one KawaPress locale key. */
  localeLabels?: Record<string, Partial<CommentsLabels>>
}

/** Every optional giscus option filled in, so the runtime never guesses. */
export type ResolvedGiscusOptions = Required<GiscusOptions>

/** Options handed to the browser through the generator virtual module. */
export interface ResolvedCommentsOptions {
  giscus: ResolvedGiscusOptions
  labels: Partial<CommentsLabels>
  localeLabels: Record<string, Partial<CommentsLabels>>
}

/**
 * Mappings that do not need an explicit term. `specific` and `number` want a
 * fixed discussion term for each page, which this plugin does not collect yet.
 */
const SUPPORTED_MAPPINGS = ['pathname', 'url', 'title', 'og:title'] as const

const GISCUS_DEFAULTS = {
  mapping: 'pathname',
  strict: false,
  reactionsEnabled: true,
  inputPosition: 'bottom',
  loading: 'lazy',
} as const

const OPTION_PATH = 'plugins: [commentsPlugin({ giscus: ... })]'

/**
 * Validates the plugin options and fills in the giscus defaults, so the runtime
 * receives one complete, JSON-serializable object.
 */
export function resolveCommentsOptions(
  options: CommentsPluginOptions | undefined,
): ResolvedCommentsOptions {
  if (!options || typeof options !== 'object') {
    throw new Error(
      `KawaPress Comments: ${OPTION_PATH} is missing its options. `
      + 'Pass the values from the snippet that https://giscus.app generates for your repository, '
      + 'for example commentsPlugin({ giscus: { repo, repoId, category, categoryId } }).',
    )
  }

  const giscus = options.giscus
  if (!giscus || typeof giscus !== 'object') {
    throw new Error(
      `KawaPress Comments: ${OPTION_PATH} has no "giscus" section. `
      + 'Open https://giscus.app, install the giscus app on your repository, and copy '
      + 'repo, repoId, category, and categoryId from the generated snippet.',
    )
  }

  const resolved: ResolvedGiscusOptions = {
    ...GISCUS_DEFAULTS,
    repo: requireText(giscus.repo, 'giscus.repo', 'For example "your-name/your-repo".'),
    repoId: requireText(
      giscus.repoId,
      'giscus.repoId',
      'Copy the "data-repo-id" value from the snippet on https://giscus.app.',
    ),
    category: requireText(
      giscus.category,
      'giscus.category',
      'For example "Comments"; it is the discussion category name shown on https://giscus.app.',
    ),
    categoryId: requireText(
      giscus.categoryId,
      'giscus.categoryId',
      'Copy the "data-category-id" value from the snippet on https://giscus.app.',
    ),
    strict: requireBoolean(giscus.strict, 'giscus.strict', GISCUS_DEFAULTS.strict),
    reactionsEnabled: requireBoolean(
      giscus.reactionsEnabled,
      'giscus.reactionsEnabled',
      GISCUS_DEFAULTS.reactionsEnabled,
    ),
    mapping: requireMapping(giscus.mapping),
    inputPosition: requireChoice(
      giscus.inputPosition,
      'giscus.inputPosition',
      ['top', 'bottom'],
      GISCUS_DEFAULTS.inputPosition,
    ),
    loading: requireChoice(
      giscus.loading,
      'giscus.loading',
      ['lazy', 'eager'],
      GISCUS_DEFAULTS.loading,
    ),
  }

  return {
    giscus: resolved,
    labels: resolveLabelsOption(options.labels, 'labels'),
    localeLabels: resolveLocaleLabelsOption(options.localeLabels),
  }
}

function requireText(
  value: unknown,
  path: string,
  hint: string,
): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `KawaPress Comments: ${OPTION_PATH} needs a non-empty string at "${path}", `
      + `received ${JSON.stringify(value)}. ${hint}`,
    )
  }
  return value.trim()
}

function requireBoolean(
  value: unknown,
  path: string,
  fallback: boolean,
): boolean {
  if (value === undefined) {
    return fallback
  }
  if (typeof value !== 'boolean') {
    throw new TypeError(
      `KawaPress Comments: "${path}" must be true or false, received ${JSON.stringify(value)}.`,
    )
  }
  return value
}

function requireMapping(value: unknown): GiscusMapping {
  if (value === undefined) {
    return GISCUS_DEFAULTS.mapping
  }
  if (isOneOf(value, SUPPORTED_MAPPINGS)) {
    return value
  }
  const reason = isOneOf(value, ['specific', 'number'])
    ? `"${value}" needs a discussion term written by hand for every page, which this plugin does not read yet.`
    : `Received ${JSON.stringify(value)}.`
  throw new Error(
    `KawaPress Comments: "giscus.mapping" must be one of ${SUPPORTED_MAPPINGS.join(', ')}. `
    + `${reason} Use "pathname" to give every page its own discussion automatically.`,
  )
}

function requireChoice<Value extends string>(
  value: unknown,
  path: string,
  allowed: readonly Value[],
  fallback: Value,
): Value {
  if (value === undefined) {
    return fallback
  }
  if (isOneOf(value, allowed)) {
    return value
  }
  throw new Error(
    `KawaPress Comments: "${path}" must be one of ${allowed.join(', ')}, received ${JSON.stringify(value)}.`,
  )
}

function isOneOf<Value extends string>(
  value: unknown,
  allowed: readonly Value[],
): value is Value {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

function resolveLabelsOption(
  labels: Partial<CommentsLabels> | undefined,
  path: string,
): Partial<CommentsLabels> {
  if (labels === undefined) {
    return {}
  }
  if (!labels || typeof labels !== 'object' || Array.isArray(labels)) {
    throw new Error(
      `KawaPress Comments: "${path}" must be an object such as { heading: 'Comments' }, received ${JSON.stringify(labels)}.`,
    )
  }
  if (labels.heading === undefined) {
    return {}
  }
  if (typeof labels.heading !== 'string' || labels.heading.trim() === '') {
    throw new Error(
      `KawaPress Comments: "${path}.heading" must be a non-empty string, received ${JSON.stringify(labels.heading)}.`,
    )
  }
  return { heading: labels.heading }
}

function resolveLocaleLabelsOption(
  localeLabels: Record<string, Partial<CommentsLabels>> | undefined,
): Record<string, Partial<CommentsLabels>> {
  if (localeLabels === undefined) {
    return {}
  }
  if (!localeLabels || typeof localeLabels !== 'object' || Array.isArray(localeLabels)) {
    throw new Error(
      `KawaPress Comments: "localeLabels" must map a locale key to labels, `
      + `for example { en: { heading: 'Comments' } }, received ${JSON.stringify(localeLabels)}.`,
    )
  }
  return Object.fromEntries(Object.entries(localeLabels).map(([locale, labels]) => (
    [locale, resolveLabelsOption(labels, `localeLabels.${locale}`)]
  )))
}
