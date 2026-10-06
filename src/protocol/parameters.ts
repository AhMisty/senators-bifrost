import type { RequestParameters } from '../types.ts'

/**
 * Copy and encode request parameters without mutating the input.
 *
 * 复制并编码请求参数，不修改输入。
 */
export function encodeParameters(input?: RequestParameters): URLSearchParams {
  return input instanceof URLSearchParams || typeof input === 'string'
    ? new URLSearchParams(input)
    : new URLSearchParams(
        Object.entries(input ?? {}).map(([key, value]): [string, string] => [key, String(value)]),
      )
}

/**
 * Follow PHP field naming: ignore leading spaces and NUL suffixes, normalize dots, spaces and indexes.
 *
 * 遵循 PHP 字段名规则：忽略前导空格和 NUL 后缀，规范化点、空格与数组下标。
 */
function phpField(name: string): { name: string; array: boolean } {
  const field = name.replace(/\0[\s\S]*$/, '').replace(/^ +/, '')
  const bracket = field.indexOf('[')
  if (bracket < 0) return { name: field.replace(/[ .]/g, '_'), array: false }
  const prefix = field.slice(0, bracket).replace(/[ .]/g, '_')
  if (field.indexOf(']', bracket + 1) < 0)
    return { name: `${prefix}_${field.slice(bracket + 1)}`, array: false }
  return { name: prefix, array: true }
}

/**
 * Remove route-owned fields and their PHP aliases in place.
 *
 * 原地删除路由保留字段及其 PHP 别名。
 *
 * @param arraysOnly - When true, retain canonical scalar fields and remove only arrays and aliases.
 *
 * 为 true 时保留规范标量字段，仅删除数组形式与别名。
 */
export function deleteParameters(
  parameters: URLSearchParams,
  names: readonly string[],
  arraysOnly = false,
): void {
  const owned = new Set(names.map((name) => phpField(name).name))
  const fields = [...parameters.keys()]
  for (const name of fields) {
    const field = phpField(name)
    if (owned.has(field.name) && (!arraysOnly || field.array || field.name !== name))
      parameters.delete(name)
  }
}

/**
 * Read scalars in PHP overwrite order; array assignments clear scalars of the same name.
 *
 * 按 PHP 覆盖顺序读取标量；数组赋值会清除同名标量。
 */
export function scalarParameters(source: URLSearchParams): Map<string, string> {
  const parameters = new Map<string, string>()
  for (const [name, value] of source) {
    const field = phpField(name)
    if (!field.name) continue
    if (field.array) parameters.delete(field.name)
    else parameters.set(field.name, value)
  }
  return parameters
}
