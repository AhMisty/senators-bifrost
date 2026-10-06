import { ErrorCode } from '../types.ts'
import type { HttpResponse } from './client.ts'

/**
 * Decoded data and its original response.
 *
 * 解码数据及其原始响应。
 */
export type Observed<T> = { readonly data: T; readonly response: HttpResponse }

/**
 * Planet ID reported by the response, or null when unreported.
 *
 * 响应报告的星球 ID；响应未报告时为 null。
 */
export type PlanetData<T> = T & { planetId: number | null }

/**
 * Decode once and attach the response to the result or OperationError.
 *
 * 解码一次，并把响应附于结果或 OperationError。
 */
export function observe<T>(response: HttpResponse, decode: () => T): Observed<T> {
  return { data: withResponse(response, decode), response }
}

/**
 * Known input or protocol failure; other exceptions propagate unchanged.
 *
 * 已识别的输入或协议错误；其他异常原样传播。
 */
export class OperationError extends Error {
  readonly code: ErrorCode

  response?: HttpResponse<string | Uint8Array> | undefined

  constructor(
    code: ErrorCode,
    message: string,
    response?: HttpResponse<string | Uint8Array>,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'OperationError'
    this.code = code
    this.response = response
  }
}

/**
 * Explicit server failure with its reported code when available.
 *
 * 服务端明确报告的错误及可用的错误码。
 */
export class ServerError extends OperationError {
  readonly serverCode?: string | number | undefined

  constructor(
    message: string,
    serverCode?: string | number,
    response?: HttpResponse<string | Uint8Array>,
  ) {
    super(ErrorCode.ServerError, message, response)
    this.name = 'ServerError'
    this.serverCode = serverCode
  }
}

/**
 * Identify HTTP failures after reading the complete response, retaining the diagnostic body.
 *
 * 完整读取响应后识别 HTTP 错误，保留正文用于诊断。
 *
 * @throws {ServerError} HTTP status is at least 400; the error carries the complete response.
 *
 * HTTP 状态码至少为 400；错误携带完整响应。
 */
export function checkResponseStatus(response: HttpResponse<string | Uint8Array>): void {
  if (response.status >= 400)
    throw new ServerError(`HTTP ${response.status}`, response.status, response)
}

export class ValidationError extends OperationError {
  constructor(message: string) {
    super(ErrorCode.ValidationError, message)
    this.name = 'ValidationError'
  }
}

/**
 * Attach responses to protocol errors without wrapping other exceptions.
 *
 * 给协议错误补充响应，不包装其他异常。
 *
 * @throws Decoder errors propagate unchanged; OperationError receives the response only when absent.
 *
 * 解码异常原样传播；OperationError 仅在缺少响应时补充响应。
 */
export function withResponse<T>(response: HttpResponse, decode: () => T): T {
  try {
    return decode()
  } catch (error) {
    if (error instanceof OperationError) {
      error.response ??= response
    }
    throw error
  }
}
