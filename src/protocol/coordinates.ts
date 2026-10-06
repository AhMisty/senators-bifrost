import type { Coordinate, Location } from '../types.ts'
import { ErrorCode } from '../types.ts'
import { OperationError, ValidationError } from './result.ts'
import { readChoice } from './values.ts'
const LOCATION_TYPES: readonly Location['type'][] = [1, 2, 3]

/**
 * Format galaxy:system:planet without checking business limits.
 *
 * 生成 galaxy:system:planet 文本，不检查业务范围。
 */
export function formatCoordinate(value: Coordinate): string {
  return `${value.galaxy}:${value.system}:${value.planet}`
}

/**
 * Parse bare or bracketed coordinates without checking universe bounds.
 *
 * 解析裸坐标或方括号坐标，不检查宇宙边界。
 *
 * @throws {ValidationError} The coordinate format is invalid, or a component is not a positive safe integer.
 *
 * 坐标格式无效，或分量不是正安全整数。
 */
export function parseCoordinate(text: string): Coordinate {
  const parsed = matchCoordinate(text)
  if (!parsed) throw new ValidationError('Invalid coordinates')
  return parsed
}

export function addressParams(value: Coordinate): Record<string, string> {
  return {
    galaxy: String(value.galaxy),
    system: String(value.system),
    planet: String(value.planet),
  }
}

/**
 * Decode server target types: 1 planet, 2 debris, 3 moon.
 *
 * 解码服务端目标类型：1 行星、2 残骸、3 月球。
 */
export function readLocationType(value: unknown): Location['type'] {
  return readChoice(value, LOCATION_TYPES, 'target type')
}

/**
 * Recognize three positive safe integers, bare or enclosed in brackets.
 *
 * 识别裸坐标或方括号中的三个正安全整数。
 *
 * @returns Coordinates, or null for invalid syntax or values.
 *
 * 合法坐标；格式或数值无效时为 null。
 */
export function matchCoordinate(text: string): Coordinate | null {
  const value = text.trim()
  const body = value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value
  const match = body.match(/^(\d+):(\d+):(\d+)$/)
  if (!match) return null

  const galaxy = Number(match[1]),
    system = Number(match[2]),
    planet = Number(match[3])
  if (![galaxy, system, planet].every((part) => Number.isSafeInteger(part) && part >= 1))
    return null
  return { galaxy, system, planet }
}

/**
 * Decode bare or bracketed coordinates from a response.
 *
 * 解码响应中的裸坐标或方括号坐标。
 *
 * @throws {OperationError} Invalid syntax or values, with code ParseError.
 *
 * 格式或数值无效，错误码为 ParseError。
 */
export function coordinate(text: string): Coordinate {
  const parsed = matchCoordinate(text)
  if (!parsed) throw new OperationError(ErrorCode.ParseError, 'Invalid coordinates')
  return parsed
}

/**
 * Extract the first bracketed coordinate, falling back to the first bare coordinate.
 *
 * 优先提取首个方括号坐标，否则提取首个裸坐标。
 *
 * @returns Parsed coordinates, or null when no coordinate pattern exists.
 *
 * 解析后的坐标；没有坐标模式时为 null。
 *
 * @throws {OperationError} Matched values are not positive safe integers, with code ParseError.
 *
 * 匹配到的数值不是正安全整数，错误码为 ParseError。
 */
export function coordinateIn(text: string): Coordinate | null {
  const match = text.match(/\[(\d+:\d+:\d+)\]/) ?? text.match(/(\d+:\d+:\d+)/)
  return match ? coordinate(match[1]!) : null
}
