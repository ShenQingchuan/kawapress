export interface JsonOperationOptions {
  label?: string
  path?: string
}

export function assertJsonSerializable(
  value: unknown,
  options: JsonOperationOptions = {},
): void {
  try {
    validateJsonValue(
      value,
      options.path ?? 'value',
      options.label ?? 'data',
      new Map(),
    )
  }
  catch (cause) {
    if (cause instanceof JsonSerializationError) {
      throw cause
    }
    throw new JsonSerializationError(
      `KawaPress: failed to inspect ${options.label ?? 'data'} before JSON serialization.`,
      { cause },
    )
  }
}

export function stringifyJson(
  value: unknown,
  options: JsonOperationOptions = {},
): string {
  assertJsonSerializable(value, options)

  try {
    const json = JSON.stringify(value)
    if (json === undefined) {
      throw serializationError(
        options.label ?? 'data',
        options.path ?? 'value',
        'the root value cannot be represented as JSON',
      )
    }
    return escapeJsonForJavaScript(json)
  }
  catch (cause) {
    if (cause instanceof JsonSerializationError) {
      throw cause
    }
    throw new JsonSerializationError(
      `KawaPress: failed to serialize ${options.label ?? 'data'} as JSON.`,
      { cause },
    )
  }
}

export function stringifyJsonForScript(
  value: unknown,
  options: JsonOperationOptions = {},
): string {
  return `JSON.parse(${JSON.stringify(stringifyJson(value, options))})`
}

export function parseJson<T>(
  source: string,
  options: Pick<JsonOperationOptions, 'label'> = {},
): T {
  try {
    return JSON.parse(source) as T
  }
  catch (cause) {
    const detail = cause instanceof Error ? `\n${cause.message}` : ''
    throw new SyntaxError(
      `KawaPress: failed to parse ${options.label ?? 'JSON data'}.${detail}`,
      { cause },
    )
  }
}

class JsonSerializationError extends TypeError {}

function validateJsonValue(
  value: unknown,
  path: string,
  label: string,
  ancestors: Map<object, string>,
): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw serializationError(label, path, `non-finite number ${String(value)}`)
    }
    return
  }

  if (typeof value !== 'object') {
    throw serializationError(label, path, `unsupported ${typeof value} value`)
  }

  const previousPath = ancestors.get(value)
  if (previousPath) {
    throw serializationError(
      label,
      path,
      `circular reference to ${previousPath}`,
    )
  }

  ancestors.set(value, path)
  try {
    if (Array.isArray(value)) {
      validateArray(value, path, label, ancestors)
      return
    }

    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) {
      const type = value.constructor?.name || 'non-plain object'
      throw serializationError(label, path, `unsupported ${type} instance`)
    }

    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === 'symbol') {
        throw serializationError(label, path, 'symbol-keyed property')
      }
      if (!Object.prototype.propertyIsEnumerable.call(value, key)) {
        continue
      }
      validateJsonValue(
        readProperty(value, key, path, label),
        appendProperty(path, key),
        label,
        ancestors,
      )
    }
  }
  finally {
    ancestors.delete(value)
  }
}

function validateArray(
  value: unknown[],
  path: string,
  label: string,
  ancestors: Map<object, string>,
): void {
  for (let index = 0; index < value.length; index++) {
    if (!(index in value)) {
      throw serializationError(label, `${path}[${index}]`, 'sparse array slot')
    }
    validateJsonValue(value[index], `${path}[${index}]`, label, ancestors)
  }

  for (const key of Object.keys(value)) {
    if (!isArrayIndex(key, value.length)) {
      throw serializationError(
        label,
        appendProperty(path, key),
        'array property that JSON.stringify would discard',
      )
    }
  }
}

function readProperty(
  value: object,
  key: string,
  path: string,
  label: string,
): unknown {
  try {
    return (value as Record<string, unknown>)[key]
  }
  catch (cause) {
    throw new JsonSerializationError(
      `KawaPress: cannot read ${appendProperty(path, key)} while serializing ${label}.`,
      { cause },
    )
  }
}

function isArrayIndex(key: string, length: number): boolean {
  const index = Number(key)
  return Number.isInteger(index)
    && index >= 0
    && index < length
    && String(index) === key
}

function appendProperty(path: string, key: string): string {
  return /^[A-Z_$][\w$]*$/i.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`
}

function serializationError(
  label: string,
  path: string,
  reason: string,
): JsonSerializationError {
  return new JsonSerializationError(
    [
      `KawaPress: ${label} is not JSON-serializable.`,
      `Found ${reason} at ${path}.`,
      'Use only null, booleans, finite numbers, strings, arrays, and plain objects.',
      'Convert BigInt, Date, Map, Set, functions, class instances, Vue refs, and other runtime objects before assigning them to frontmatter or pageData.',
    ].join('\n'),
  )
}

function escapeJsonForJavaScript(json: string): string {
  return json
    .replaceAll('<', '\\u003C')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}
