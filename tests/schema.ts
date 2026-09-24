// A validator for the subset of JSON Schema draft-07 that verdict.schema.json
// uses. Small on purpose: no dependency for a check that forty lines cover.
// A keyword it does not know is an error, so the schema cannot grow past what
// the tests verify in silence.
export type Schema = Record<string, unknown>

const known = new Set([
  '$schema',
  'title',
  'description',
  'type',
  'required',
  'properties',
  'items',
  'enum',
  'maxLength',
  'minimum',
  'maximum',
  'pattern',
])

function typeOf(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number' && Number.isInteger(value)) return 'integer'
  return typeof value
}

export function validate(value: unknown, schema: Schema, path = '$'): string[] {
  const errors: string[] = []
  for (const key of Object.keys(schema)) {
    if (!known.has(key)) errors.push(`${path}: unsupported keyword ${key}`)
  }
  if (schema.type !== undefined) {
    const types = ([] as string[]).concat(schema.type as string | string[])
    const actual = typeOf(value)
    const ok = types.some(
      (t) => t === actual || (t === 'number' && actual === 'integer'),
    )
    if (!ok)
      return [...errors, `${path}: expected ${types.join('|')}, got ${actual}`]
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push(`${path}: not one of ${JSON.stringify(schema.enum)}`)
  }
  if (typeof value === 'string') {
    if (
      typeof schema.maxLength === 'number' &&
      value.length > schema.maxLength
    ) {
      errors.push(
        `${path}: ${value.length} characters, max ${schema.maxLength}`,
      )
    }
    if (
      typeof schema.pattern === 'string' &&
      !new RegExp(schema.pattern).test(value)
    ) {
      errors.push(`${path}: does not match ${schema.pattern}`)
    }
  }
  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      errors.push(`${path}: ${value} < ${schema.minimum}`)
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      errors.push(`${path}: ${value} > ${schema.maximum}`)
    }
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const object = value as Record<string, unknown>
    for (const key of (schema.required as string[] | undefined) ?? []) {
      if (!(key in object)) errors.push(`${path}: missing ${key}`)
    }
    const properties =
      (schema.properties as Record<string, Schema> | undefined) ?? {}
    for (const [key, sub] of Object.entries(properties)) {
      if (key in object)
        errors.push(...validate(object[key], sub, `${path}.${key}`))
    }
  }
  if (Array.isArray(value) && schema.items !== undefined) {
    value.forEach((item, i) =>
      errors.push(...validate(item, schema.items as Schema, `${path}[${i}]`)),
    )
  }
  return errors
}
