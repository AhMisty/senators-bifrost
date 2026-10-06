import { ErrorCode } from '../types.ts'
import { OperationError } from './result.ts'

/**
 * Narrow externally read fields to a complete record; missing required fields are parse errors.
 *
 * 将外部读取的字段收窄为完整记录；缺少任何必需字段均为解析错误。
 */
export function requireCompleteRecord<Key extends string, Value>(
  names: readonly Key[],
  values: Record<string, Value>,
): asserts values is Record<string, Value> & Record<Key, Value> {
  for (const name of names)
    if (values[name] === undefined)
      throw new OperationError(ErrorCode.ParseError, `Missing ${name} form field`)
}

/**
 * Encode declared endpoint fields, omitting values not supplied.
 *
 * 仅生成接口声明的字段，省略未提供的值。
 */
export function fixedFields<Key extends string>(
  names: readonly Key[],
  values: Readonly<Partial<Record<Key, string | number>>>,
): Record<string, string | number> {
  const fields: [string, string | number][] = []
  for (const name of names) {
    const value = values[name]
    if (value !== undefined) fields.push([name, value])
  }
  return Object.fromEntries(fields)
}
