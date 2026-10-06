import type { Session } from '../session.ts'
import type { PlanetReference, RequestParameters } from '../types.ts'
import type { Ack, PageReply } from './ack.ts'
import { ackOf, receiptOf } from './ack.ts'
import type { HttpResponse } from './client.ts'
import type { Page } from './page.ts'
import { parsePage } from './page.ts'
import { deleteParameters, encodeParameters } from './parameters.ts'
import { observe } from './result.ts'
import type { Observed, PlanetData } from './result.ts'
import type { PageRoute } from './routes.ts'
import { ownedParameters } from './routes.ts'

type EndpointRequestBase = {
  query?: RequestParameters | undefined

  withCookie?: boolean | undefined
}

/**
 * Request query and cookie policy, with an optional POST form body.
 *
 * 请求查询与 Cookie 策略；POST 可携带表单正文。
 */
export type EndpointOptions = EndpointRequestBase &
  ({ method?: 'GET'; body?: never } | { method: 'POST'; body?: RequestParameters })

export type PageOptions = EndpointOptions & PageScope

/**
 * Select the current planet through cp.
 *
 * 使用 cp 指定当前星球。
 */
export type PageScope = {
  planetId?: number | undefined
}

export type RequestOptions = { withCookie?: boolean | undefined } & (
  | { url: URL; method: 'GET' }
  | { url: URL; method: 'POST'; body: URLSearchParams }
)

/**
 * Routes own page, mode, fixed fields, explicit planet and public universe parameters.
 *
 * 路由拥有 page、mode、固定字段、显式星球与公开宇宙参数，调用方不能覆盖。
 */
export function routeRequest(
  session: Session,
  route: PageRoute,
  options: PageOptions = {},
): RequestOptions {
  const url = session.pageUrl(route, options.planetId, options.query)
  const { withCookie } = options
  if (options.method !== 'POST') return { url, method: 'GET', withCookie }
  const body = encodeParameters(options.body)
  deleteParameters(body, ownedParameters(route, options.planetId))
  return { url, method: 'POST', body, withCookie }
}

/**
 * Send one route request and retain its raw response.
 *
 * 发送一次路由请求，保留原始响应。
 */
export function routeResponse(
  session: Session,
  route: PageRoute,
  options: PageOptions = {},
): Promise<HttpResponse> {
  return session.request(routeRequest(session, route, options))
}

/**
 * Read the requested document or server receipt; planet context comes from the response.
 *
 * 读取目标文档或服务端回执；星球信息取自响应。
 *
 * @param planet - Whether to include a planet ID; defaults to true when planetId is supplied, with null when unreported.
 *
 * 是否附加星球 ID，默认在指定 planetId 时附加；响应未报告时为 null。
 */
export function routePage<T extends { kind: string }>(
  session: Session,
  route: PageRoute,
  options: PageOptions & PlanetReference,
  decode: (page: Page) => T,
  planet?: true,
): Promise<Observed<PlanetData<PageReply<T>>>>
export function routePage<T extends { kind: string }>(
  session: Session,
  route: PageRoute,
  options: PageOptions,
  decode: (page: Page) => T,
  planet?: boolean,
): Promise<Observed<PageReply<T>>>
export async function routePage<T extends { kind: string }>(
  session: Session,
  route: PageRoute,
  options: PageOptions = {},
  decode: (page: Page) => T,
  planet = options.planetId !== undefined,
): Promise<Observed<PageReply<T>>> {
  return readReply(session, await routeResponse(session, route, options), decode, planet)
}

/**
 * Decode an existing response and attach it to the result or protocol error.
 *
 * 解码已有响应，将实际响应附于结果或协议错误。
 *
 * @param planet - Whether to include the response planet ID; disabled by default, with null when enabled but unreported.
 *
 * 是否附加响应中的星球 ID；默认不附加，启用但未报告时为 null。
 */
export function readReply<T extends { kind: string }>(
  session: Session,
  response: HttpResponse,
  decode: (page: Page) => T,
  planet: true,
): Observed<PlanetData<PageReply<T>>>
export function readReply<T extends { kind: string }>(
  session: Session,
  response: HttpResponse,
  decode: (page: Page) => T,
  planet?: boolean,
): Observed<PageReply<T>>
export function readReply<T extends { kind: string }>(
  session: Session,
  response: HttpResponse,
  decode: (page: Page) => T,
  planet = false,
): Observed<PageReply<T>> {
  return observe(response, () => {
    let parsed: Page | undefined
    const page = (): Page => (parsed ??= parsePage(response))
    const answer = ackOf(session, response, page)
    const data = receiptOf(answer) ?? decode(page())
    return planet && !('planetId' in data)
      ? { ...data, planetId: parsed?.optionalPlanetId() ?? null }
      : data
  })
}

/**
 * Send a route request and classify its receipt without decoding a business document.
 *
 * 发送路由请求并识别回执，不解码业务文档。
 */
export function routeAck(
  session: Session,
  route: PageRoute,
  options: PageOptions & PlanetReference,
  planet?: true,
): Promise<Observed<PlanetData<Ack>>>
export function routeAck(
  session: Session,
  route: PageRoute,
  options?: PageOptions,
  planet?: boolean,
): Promise<Observed<Ack>>
export async function routeAck(
  session: Session,
  route: PageRoute,
  options: PageOptions = {},
  planet = options.planetId !== undefined,
): Promise<Observed<Ack>> {
  return readAck(session, await routeResponse(session, route, options), planet)
}

/**
 * Classify an existing response as a receipt.
 *
 * 识别已有响应的回执。
 */
export function readAck(
  session: Session,
  response: HttpResponse,
  planet: true,
): Observed<PlanetData<Ack>>
export function readAck(session: Session, response: HttpResponse, planet?: boolean): Observed<Ack>
export function readAck(session: Session, response: HttpResponse, planet = false): Observed<Ack> {
  return readReply(session, response, () => ({ kind: 'page' as const }), planet)
}
