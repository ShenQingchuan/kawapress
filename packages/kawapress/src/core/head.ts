import type { ReactiveHead } from '@unhead/vue'

export type HeadTag = 'meta' | 'link' | 'script' | 'style' | 'noscript'

export type HeadAttrs = Record<string, string | boolean>

/**
 * One `<head>` tag written as JSON data: the tag name, its attributes, and
 * optional raw inner content.
 */
export type HeadConfig
  = | [tag: HeadTag, attrs: HeadAttrs]
    | [tag: HeadTag, attrs: HeadAttrs, content: string]

const HEAD_TAGS = new Set<string>(['meta', 'link', 'script', 'style', 'noscript'])

/** KawaPress owns the document title and base URL, so users cannot add them. */
const RESERVED_HEAD_TAGS: Record<string, string> = {
  title: 'KawaPress builds <title> from the page title and the "titleTemplate" frontmatter field',
  base: 'KawaPress builds <base> from the site "base" config',
}

/** Void elements cannot hold content, so the third tuple element is rejected. */
const VOID_HEAD_TAGS = new Set<string>(['meta', 'link'])

const HEAD_TAG_LIST = '"meta", "link", "script", "style", "noscript"'
const HEAD_ENTRY_EXAMPLE = 'Each entry looks like ["meta", { "name": "description", "content": "KawaPress" }].'

export interface HeadConfigSource {
  /** Where the head config comes from. Starts every error message. */
  owner: string
  /** JSON path of the head array inside its owner, e.g. `head` or `locales.en.head`. */
  path: string
}

/**
 * Checks a `head` value read from the site config, a locale config, or page
 * frontmatter, and returns it as a typed copy. `undefined` and `null` mean the
 * source does not configure any tag.
 */
export function resolveHeadConfig(
  value: unknown,
  source: HeadConfigSource,
): HeadConfig[] {
  if (value === undefined || value === null) {
    return []
  }
  if (!Array.isArray(value)) {
    throw headError(
      source,
      `${source.path} must be an array of head tags, got ${describeValue(value)}.`,
    )
  }

  return value.map((entry, index) => resolveHeadEntry(
    entry,
    `${source.path}[${index}]`,
    source,
  ))
}

/**
 * Converts KawaPress head entries into `useHead` input: one array of attribute
 * objects per tag name, keeping the entry order.
 *
 * unhead types the attributes of each tag separately, while head config is
 * open-ended JSON, so the result is cast to the input type here.
 */
export function headConfigToUnheadInput(
  head: readonly HeadConfig[],
): ReactiveHead {
  const tags: Record<string, HeadAttrs[]> = {}
  for (const [tag, attrs, content] of head) {
    const props: HeadAttrs = {
      ...attrs,
      ...(content === undefined ? {} : { innerHTML: content }),
    }
    tags[tag] = [...(tags[tag] ?? []), props]
  }
  return tags as unknown as ReactiveHead
}

function resolveHeadEntry(
  entry: unknown,
  path: string,
  source: HeadConfigSource,
): HeadConfig {
  if (!Array.isArray(entry)) {
    throw headError(
      source,
      `${path} must be a head tag tuple, got ${describeValue(entry)}.`,
    )
  }
  if (entry.length !== 2 && entry.length !== 3) {
    throw headError(
      source,
      `${path} must have 2 or 3 elements, got ${entry.length}.`,
    )
  }

  const [tag, rawAttrs, content] = entry
  if (typeof tag !== 'string' || !HEAD_TAGS.has(tag)) {
    throw headError(
      source,
      `${path}[0] must be one of ${HEAD_TAG_LIST}, got ${describeValue(tag)}.`,
      typeof tag === 'string' && tag in RESERVED_HEAD_TAGS
        ? `${RESERVED_HEAD_TAGS[tag]}, so it is not accepted here. Remove this entry from ${source.path}.`
        : HEAD_ENTRY_EXAMPLE,
    )
  }

  const headTag = tag as HeadTag
  const attrs = resolveHeadAttrs(rawAttrs, `${path}[1]`, source)
  if (content === undefined) {
    return [headTag, attrs]
  }
  if (typeof content !== 'string') {
    throw headError(
      source,
      `${path}[2] must be the tag content as a string, got ${describeValue(content)}.`,
    )
  }
  if (VOID_HEAD_TAGS.has(headTag)) {
    throw headError(
      source,
      `${path}[2] is not supported: <${headTag}> is an empty element and cannot hold content.`,
      `Move the value into the attributes of <${headTag}> instead.`,
    )
  }

  return [headTag, attrs, content]
}

function resolveHeadAttrs(
  value: unknown,
  path: string,
  source: HeadConfigSource,
): HeadAttrs {
  if (!isPlainObject(value)) {
    throw headError(
      source,
      `${path} must be an object of attributes like { "name": "description" }, got ${describeValue(value)}.`,
    )
  }

  const attrs: HeadAttrs = {}
  for (const [name, attrValue] of Object.entries(value)) {
    if (typeof attrValue !== 'string' && typeof attrValue !== 'boolean') {
      throw headError(
        source,
        `${appendAttribute(path, name)} must be a string or boolean, got ${describeValue(attrValue)}.`,
      )
    }
    attrs[name] = attrValue
  }
  return attrs
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function appendAttribute(path: string, name: string): string {
  return /^[\w$-]+$/.test(name) ? `${path}.${name}` : `${path}[${JSON.stringify(name)}]`
}

function headError(
  source: HeadConfigSource,
  problem: string,
  hint = HEAD_ENTRY_EXAMPLE,
): Error {
  return new Error([
    `KawaPress: invalid head config in ${source.owner}.`,
    problem,
    hint,
  ].join('\n'))
}

function describeValue(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  if (value === undefined) {
    return 'undefined'
  }
  if (Array.isArray(value)) {
    return 'an array'
  }
  switch (typeof value) {
    case 'string':
      return `the string ${JSON.stringify(value)}`
    case 'boolean':
    case 'number':
    case 'bigint':
      return `the ${typeof value} ${String(value)}`
    case 'object': {
      const name = value.constructor?.name
      return name && name !== 'Object' ? `a ${name}` : 'an object'
    }
    default:
      return `a ${typeof value}`
  }
}
