import type { Session } from '../session.ts'
import { ErrorCode } from '../types.ts'
import type { HttpResponse } from './client.ts'
import { textContent } from './dom.ts'
import { responseShape } from './page.ts'
import type { Page } from './page.ts'
import { checkResponseStatus, OperationError, ServerError } from './result.ts'
import { GAME_ROUTES } from './routes.ts'
import type { StaticValue } from './script-data.ts'

/**
 * Server message text with visible breaks and collapsed inline whitespace.
 *
 * 服务端消息正文，保留可见换行并压缩行内空白。
 */
export type MessageAck = { kind: 'message'; message: string }

/**
 * Redirect target; the client does not follow it.
 *
 * 重定向目标；客户端不会自动跟随。
 */
export type RedirectAck = { kind: 'redirect'; target: URL }

/**
 * JSON data with numeric literals preserved as strings.
 *
 * JSON 数据；数值字面量保留为字符串。
 */
export type JsonAck = { kind: 'json'; value: StaticValue }

export type PageAck = { kind: 'page' }
export type TextAck = { kind: 'text'; text: string }
export type EmptyAck = { kind: 'empty' }

/**
 * Receipt classified by response shape; message text does not imply business success.
 *
 * 按响应实际形态返回的回执，不推断消息是否表示业务成功。
 */
export type Ack = MessageAck | RedirectAck | JsonAck | PageAck | TextAck | EmptyAck

/**
 * Requested document or the receipt the server returned instead.
 *
 * 目标文档或服务端返回的其他回执。
 */
export type PageReply<T> = T | Exclude<Ack, PageAck>

/**
 * Classify redirects, explicit server errors and bodies; New-Star may serve JSON as text/html.
 *
 * 识别重定向、明确的服务端错误与响应正文；New-Star 的 JSON 也可能使用 text/html。
 *
 * @param receipt - Whether to recognize public and admin message cards; defaults to true.
 *
 * 是否识别公开与管理页面的消息卡片，默认为 true。
 *
 * @throws {ServerError} HTTP or a recognized business response explicitly reports failure.
 *
 * HTTP 或已识别的业务响应明确报告失败。
 */
export function ackOf(
  session: Session,
  response: HttpResponse,
  page: () => Page,
  receipt = true,
): Ack {
  checkResponseStatus(response)
  const target = session.location(response)
  if (target) {
    const code = target.searchParams.get('code')
    if (
      session.redirectsTo(response, 'index.php') &&
      (code === '1' || code === '3' || code === '4' || code === '5')
    )
      throw new ServerError('Authentication failed', code, response)
    if (response.url.pathname.endsWith('/admin.php') && session.redirectsTo(response, 'game.php'))
      throw new ServerError('Administrative access required', 'admin-authentication', response)
    if (
      session.redirectsTo(response, 'game.php') &&
      target.searchParams.get('page') === GAME_ROUTES.fleetTable.page &&
      code !== null &&
      code !== '0'
    )
      throw new ServerError('Fleet dispatch failed', code, response)
    return { kind: 'redirect', target }
  }
  if (
    response.url.pathname.endsWith('/game.php') &&
    response.url.searchParams.get('page') === GAME_ROUTES.battleSimulatorSend.page &&
    response.url.searchParams.get('mode') === GAME_ROUTES.battleSimulatorSend.mode &&
    response.body.trim() === '0'
  )
    throw new ServerError('Battle simulation failed', 0, response)
  const fleetFailure = response.url.pathname.endsWith('/game.php')
    ? response.body.match(/^.*\.php on \d+ \| Code: (-?\d+) \| Error: ([\s\S]*)$/)
    : null
  if (fleetFailure && fleetFailure[1] !== '0')
    throw new ServerError(fleetFailure[2]!, fleetFailure[1], response)

  switch (responseShape(response)) {
    case 'html': {
      const document = page()

      if (
        document
          .$('body > b')
          .toArray()
          .some((node) => textContent(document.$(node)) === 'Fatal error')
      )
        throw new ServerError(textContent(document.$('body')), undefined, response)
      if (
        response.url.pathname.endsWith('/admin.php') &&
        document.$('input[name="admin_pw"]').length
      )
        throw new ServerError('Administrative access required', 'admin-authentication', response)
      const message = document.message(receipt)
      return message === null ? { kind: 'page' } : { kind: 'message', message }
    }
    case 'json': {
      const value = readJson(response)
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        value.error === true
      ) {
        if (typeof value.message !== 'string')
          throw new OperationError(ErrorCode.ParseError, 'Missing server error message', response)
        throw new ServerError(value.message, undefined, response)
      }
      if (response.url.pathname.endsWith('/game.php')) {
        const name = response.url.searchParams.get('page')
        const mode = response.url.searchParams.get('mode')
        if (typeof value === 'string') {
          if (
            name === GAME_ROUTES.fleetStep1CheckTarget.page &&
            mode === GAME_ROUTES.fleetStep1CheckTarget.mode &&
            value !== 'OK'
          )
            throw new ServerError(value, undefined, response)
          if (
            name === GAME_ROUTES.fleetTable.page &&
            response.url.searchParams.get('action') === 'acs'
          )
            throw new ServerError(value, undefined, response)
        }
        if (
          name === GAME_ROUTES.overviewDelete.page &&
          mode === GAME_ROUTES.overviewDelete.mode &&
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          typeof value.message === 'string' &&
          value.ok !== true
        )
          throw new ServerError(value.message, undefined, response)
      }
      return { kind: 'json', value }
    }
    case 'empty':
      return { kind: 'empty' }
    default:
      return { kind: 'text', text: response.body }
  }
}

/**
 * Pass a classified receipt to the caller or page reader.
 *
 * 将已分类回执交给调用方或页面读取器。
 *
 * @returns A non-page receipt, or null for a page to be decoded by its reader.
 *
 * 非页面回执；普通页面为 null，由页面读取器继续解码。
 */
export function receiptOf(ack: Ack): Exclude<Ack, PageAck> | null {
  return ack.kind === 'page' ? null : ack
}

/**
 * Preserve numeric source text to avoid rounding large JSON integers.
 *
 * 保留数值的源文本，避免 JSON 解析丢失大整数精度。
 */
export function readJson(response: HttpResponse): StaticValue {
  try {
    const data: StaticValue = JSON.parse(
      response.body,
      (_key: string, value: unknown, context?: { source: string }) =>
        typeof value === 'number' ? context!.source : value,
    )
    return data
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    throw new OperationError(ErrorCode.ParseError, 'Invalid JSON response', response, {
      cause: error,
    })
  }
}
