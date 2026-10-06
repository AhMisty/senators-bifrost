import { ErrorCode } from '../types.ts'
import type { Timing } from '../types.ts'
import { OperationError } from './result.ts'

const NUMERIC_TEXT = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i

function numericValue(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const text = value.trim()
    if (NUMERIC_TEXT.test(text)) return Number(text)
  }
  return null
}

/**
 * Extract error text without the standard error-class prefix.
 *
 * 提取错误文本，移除标准错误类名前缀。
 */
export function refusalText(error: unknown): string {
  return String(error).replace(/^[A-Za-z]*Error: /, '')
}

/**
 * Decode finite decimal or exponent-form response numbers.
 *
 * 解码有限响应数值，支持十进制与指数形式。
 *
 * @throws {OperationError} Input is not a finite number or valid numeric text, with code ParseError.
 *
 * 输入不是有限数值或有效数值文本，错误码为 ParseError。
 */
export function readDecimal(value: unknown): number {
  const parsed = readOptionalDecimal(value)
  if (parsed !== null) return parsed
  throw new OperationError(ErrorCode.ParseError, 'Expected a numeric value')
}

/**
 * Read an optional finite response number.
 *
 * 读取可选的有限响应数值。
 *
 * @returns A finite number, or null for invalid or nonfinite input.
 *
 * 有限数值；输入无效或非有限时为 null。
 */
export function readOptionalDecimal(value: unknown): number | null {
  const parsed = numericValue(value)
  return parsed !== null && Number.isFinite(parsed) ? parsed : null
}

/**
 * Read a nonnegative response number.
 *
 * 读取非负响应数值。
 */
export function readAmount(value: unknown): number {
  const parsed = readDecimal(value)
  if (parsed < 0) throw new OperationError(ErrorCode.ParseError, 'Expected a nonnegative amount')
  return parsed
}

/**
 * Read whole quantities; values beyond the safe-integer range are approximate numbers.
 *
 * 读取整数量级；超过安全整数范围时以近似 number 返回。
 *
 * @param minimum - Inclusive lower bound, defaulting to zero.
 *
 * 允许的最小值，默认为零。
 *
 * @throws {OperationError} Input is not a finite integer meeting the lower bound, with code ParseError.
 *
 * 输入不是满足下限的有限整数，错误码为 ParseError。
 */
export function readQuantity(value: unknown, minimum = 0): number {
  const parsed = readDecimal(value)
  if (!Number.isInteger(parsed) || parsed < minimum)
    throw new OperationError(
      ErrorCode.ParseError,
      minimum === 0
        ? 'Expected a nonnegative whole number'
        : `Expected a whole number of at least ${minimum}`,
    )
  return parsed
}

/**
 * Read a response ID or index that must be represented exactly.
 *
 * 读取必须精确表示的响应 ID 或索引。
 *
 * @param minimum - Inclusive lower bound, defaulting to zero.
 *
 * 允许的最小值，默认为零。
 *
 * @throws {OperationError} Input is not a safe integer meeting the lower bound, with code ParseError.
 *
 * 输入不是满足下限的安全整数，错误码为 ParseError。
 */
export function readInteger(value: unknown, minimum = 0): number {
  const parsed = readDecimal(value)
  if (!Number.isSafeInteger(parsed))
    throw new OperationError(ErrorCode.ParseError, 'Expected a safe integer')
  if (parsed < minimum)
    throw new OperationError(ErrorCode.ParseError, `Expected a safe integer of at least ${minimum}`)
  return parsed
}

/**
 * Read an indexed item, raising a parse error when absent.
 *
 * 读取指定位置；缺失项抛出解析错误。
 */
export function readAt<T>(items: readonly T[], index: number): T {
  const value = items[index]
  if (value === undefined)
    throw new OperationError(ErrorCode.ParseError, `Missing element ${index} of ${items.length}`)
  return value
}

function displayedText(value: string): string {
  const text = value.trim()
  if (!/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(text))
    throw new OperationError(ErrorCode.ParseError, 'Invalid formatted quantity')
  return text.replaceAll('.', '').replace(',', '.')
}

/**
 * Decode server display formatting: grouping dots and a decimal comma.
 *
 * 解码服务端显示格式：点为分组符，逗号为小数点。
 */
export function displayed(value: string): number {
  return readDecimal(displayedText(value))
}

/**
 * Extract leading display-number text, or null when unmatched.
 *
 * 提取开头的显示数值文本；未匹配时返回 null。
 */
export function leadingDisplayed(text: string): string | null {
  return text.match(/^[\d.,]*\d/)?.[0] ?? null
}

/**
 * Read a leading display quantity from text with a unit.
 *
 * 读取带单位文本开头的显示数值。
 */
export function leadingQuantity(text: string): number {
  const digits = leadingDisplayed(text.trim())
  if (digits === null) throw new OperationError(ErrorCode.ParseError, 'Missing a quantity')
  return displayed(digits)
}

/**
 * Read a level and optional cap, allowing parentheses and percent signs.
 *
 * 读取等级及可选上限，支持括号与百分号。
 */
export function levelPair(
  text: string,
  decode: (value: string) => number,
): { level: number; maximum: number | null } {
  const match = text.match(
    /^[^\d+/-]*?([+-]?\d[\d.,]*(?:e[+-]?\d+)?)(?:\s*\/\s*([+-]?\d[\d.,]*(?:e[+-]?\d+)?))?\s*%?\s*\)?$/i,
  )
  if (!match) throw new OperationError(ErrorCode.ParseError, 'Invalid level label')
  return {
    level: decode(match[1]!),
    maximum: match[2] === undefined ? null : decode(match[2]),
  }
}

const DISPLAY_POWERS: Readonly<Record<string, number>> = {
  K: 3,
  M: 6,
  B: 12,
  T: 18,
  Q: 24,
  'Q+': 30,
  S: 36,
  'S+': 42,
  O: 48,
  N: 54,
}

/**
 * Expand abbreviated decimal text without intermediate floating-point multiplication.
 *
 * 按十进制文本恢复缩写倍率，避免中间浮点乘法。
 */
function scaleDigits(digits: string, places: number): string {
  const negative = digits.startsWith('-')
  const body = negative ? digits.slice(1) : digits
  const point = body.indexOf('.')
  const whole = point < 0 ? body : body.slice(0, point)
  const fraction = point < 0 ? '' : body.slice(point + 1)
  const scaled = (whole + fraction).padEnd(whole.length + places, '0')
  const cut = whole.length + places
  const text = cut < scaled.length ? `${scaled.slice(0, cut)}.${scaled.slice(cut)}` : scaled
  return negative ? `-${text}` : text
}

const ABBREVIATED_TEXT = /^([+\-\d.,]+)\s*([A-Za-z]\+?)?$/

/**
 * Decode server abbreviations such as 1,23 K using New-Star display scales.
 *
 * 解码服务端缩写数量，如 1,23 K；倍率由 New-Star 显示规则定义。
 */
export function abbreviated(value: string): number {
  const match = value.trim().match(ABBREVIATED_TEXT)
  if (!match) throw new OperationError(ErrorCode.ParseError, 'Unknown abbreviated quantity')
  const digits = displayedText(match[1]!)
  const suffix = match[2]
  if (!suffix) return readDecimal(digits)
  const power = DISPLAY_POWERS[suffix.toUpperCase()]

  if (power === undefined)
    throw new OperationError(ErrorCode.ParseError, 'Unknown abbreviated quantity')
  return readDecimal(scaleDigits(digits, power))
}

/**
 * Calculate unfinished duration using matching time units.
 *
 * 按相同时间单位计算未完成时长。
 *
 * @returns Remaining duration, clamped at zero.
 *
 * 剩余时长，最低为零。
 */
export function countdownRemaining(duration: number, elapsed: number): number {
  return Math.max(0, duration - elapsed)
}

/**
 * Calculate progress from total and remaining duration; zero duration is complete.
 *
 * 根据总时长与剩余时长计算进度；零时长视为完成。
 */
export function timing(durationSeconds: number, remainingSeconds: number): Timing {
  return {
    durationSeconds,
    remainingSeconds,
    progressPercent: durationSeconds === 0 ? 100 : 100 * (1 - remainingSeconds / durationSeconds),
  }
}
