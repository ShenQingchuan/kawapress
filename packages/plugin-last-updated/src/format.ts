const DEFAULT_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: 'medium',
  timeStyle: 'short',
}

/**
 * Options that describe the date field by field. `Intl.DateTimeFormat` rejects
 * them together with `dateStyle`/`timeStyle`, so the defaults step aside.
 */
const FIELD_OPTION_KEYS = [
  'weekday',
  'era',
  'year',
  'month',
  'day',
  'dayPeriod',
  'hour',
  'minute',
  'second',
  'fractionalSecondDigits',
  'timeZoneName',
] as const

/** Formatters are expensive to create and depend only on their arguments. */
const formatterCache = new Map<string, Intl.DateTimeFormat>()
const MAX_CACHED_FORMATTERS = 32

export function resolveFormatOptions(
  formatOptions: Intl.DateTimeFormatOptions = {},
): Intl.DateTimeFormatOptions {
  const usesFields = FIELD_OPTION_KEYS.some(key => formatOptions[key] !== undefined)
  return usesFields
    ? { ...formatOptions }
    : { ...DEFAULT_FORMAT_OPTIONS, ...formatOptions }
}

/**
 * Formats `value` for `lang`. Without an explicit `timeZone` the visitor's zone
 * is used, so server rendering has to pass `'UTC'` to stay deterministic.
 */
export function formatLastUpdatedDate(
  value: number,
  lang: string,
  formatOptions?: Intl.DateTimeFormatOptions,
  timeZone?: string,
): string {
  return createDateFormatter(lang, formatOptions, timeZone).format(value)
}

export function createDateFormatter(
  lang: string,
  formatOptions: Intl.DateTimeFormatOptions = {},
  timeZone?: string,
): Intl.DateTimeFormat {
  const options = resolveFormatOptions(formatOptions)
  if (timeZone !== undefined) {
    options.timeZone = timeZone
  }

  const key = `${lang}\u0000${JSON.stringify(options)}`
  const cached = formatterCache.get(key)
  if (cached) {
    return cached
  }

  const formatter = buildFormatter(lang, options)
  if (formatterCache.size >= MAX_CACHED_FORMATTERS) {
    formatterCache.clear()
  }
  formatterCache.set(key, formatter)
  return formatter
}

function buildFormatter(
  lang: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(lang, options)
  }
  catch (cause) {
    throw new RangeError(
      [
        `KawaPress Last Updated: cannot format dates for lang ${JSON.stringify(lang)} with ${JSON.stringify(options)}.`,
        'Fix `lang` in the matching `locales` entry, or the `lastUpdated.formatOptions` passed to the plugin.',
      ].join(' '),
      { cause },
    )
  }
}
