import type { ElementInput } from '../types.ts'

/**
 * Encode element fields in the input Map's order.
 *
 * 按输入 Map 的顺序生成元素字段。
 */
export function elementFields(
  input: ElementInput,
  prefix: string,
  suffix: string,
): [string, string][] {
  return [...input].map(([id, count]): [string, string] => [
    `${prefix}${id}${suffix}`,
    String(count),
  ])
}

export function elementBody(input: ElementInput, prefix: string, suffix: string): URLSearchParams {
  return new URLSearchParams(elementFields(input, prefix, suffix))
}

/**
 * Encode the selected element fields in the declared ID order.
 *
 * 按声明的 ID 顺序生成指定元素字段。
 */
export function fixedElementBody<Id extends number>(
  input: ElementInput<Id>,
  ids: readonly Id[],
  prefix: string,
  suffix: string,
): URLSearchParams {
  const fields: [string, string][] = []
  for (const id of ids) {
    const amount = input.get(id)
    if (amount !== undefined) fields.push([`${prefix}${id}${suffix}`, String(amount)])
  }
  return new URLSearchParams(fields)
}
