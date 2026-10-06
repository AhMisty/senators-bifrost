import assert from 'node:assert/strict'

import type {
  Ack,
  AccountSettingsPage,
  AllianceAdminOverviewPage,
  Fetch,
  GrowthModule,
  HttpResponse,
  Observed,
  PageReply,
  SnapshotResult,
} from '../src/index.ts'
import { OperationError, Session } from '../src/index.ts'

export function fulfilled<T>(result: SnapshotResult<T>): T {
  if (result.status !== 'fulfilled')
    assert.fail(`Expected fulfilled snapshot entry, got ${result.status}`)
  return result.value
}

/**
 * An installation subdirectory exercises relative URL resolution.
 *
 * 使用安装子目录验证相对地址解析。
 */
export const BASE_URL = 'https://uni.example.com/play/'

const UNIVERSE = 42

export const TOKEN = 'a1b2c3'

export const PLANET_ID = 1000

type RecordedRequest = {
  url: URL
  method: string
  headers: Record<string, string>
  /**
   * Captured URLSearchParams body, or null when none is supplied.
   *
   * 记录 URLSearchParams 正文；没有此类正文时为 null。
   */
  body: URLSearchParams | null

  redirect: RequestInit['redirect']
}

export type Reply = {
  status?: number
  body?: string
  /**
   * Arrays preserve repeated headers such as Set-Cookie.
   *
   * 数组保留 Set-Cookie 等重复响应头。
   */
  headers?: Record<string, string | string[]>
}

export type Server = {
  requests: RecordedRequest[]
  fetch: Fetch
}

function headersFrom(entries: Record<string, string | string[]>): Headers {
  const headers = new Headers()
  for (const [name, value] of Object.entries(entries))
    for (const item of Array.isArray(value) ? value : [value]) headers.append(name, item)
  return headers
}

function headerRecord(init: RequestInit['headers']): Record<string, string> {
  const record: Record<string, string> = {}
  if (init === undefined) return record
  if (Array.isArray(init)) for (const [name, value] of init) record[name] = value
  else if (init instanceof Headers) init.forEach((value, name) => (record[name] = value))
  else Object.assign(record, init)
  return record
}

export function htmlResponse(body: string): Reply {
  return { body: pageHtml(body), headers: { 'Content-Type': 'text/html; charset=utf-8' } }
}

/**
 * Wrap a complete HTML document as a response.
 *
 * 将完整 HTML 文档包装成响应。
 */
export function pageReply(body: string): Reply & { body: string } {
  return { body, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
}

export function jsonResponse(body: string): Reply {
  return { body, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
}

/**
 * Wrap markup in the server document shell.
 *
 * 将片段包装成服务端文档外壳。
 */
export function pageHtml(body: string): string {
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"><title>Test</title></head>',
    `<body>${body}</body>`,
    '</html>',
  ].join('')
}

/**
 * Record requests and return the configured responses in order.
 *
 * 记录请求并依次返回配置的响应。
 */
export function fakeServer(replies: Reply | Reply[] = {}): Server {
  const requests: RecordedRequest[] = []
  const fetch: Fetch = async (input, init = {}) => {
    if (!(input instanceof URL)) throw new TypeError('Expected a URL request')
    const request: RecordedRequest = {
      url: input,
      method: init.method ?? 'GET',
      headers: headerRecord(init.headers),
      body: init.body instanceof URLSearchParams ? init.body : null,
      redirect: init.redirect,
    }
    requests.push(request)
    const reply = Array.isArray(replies)
      ? (replies[requests.length - 1] ?? htmlResponse(''))
      : replies
    return new Response(reply.body ?? '', {
      status: reply.status ?? 200,
      headers: headersFrom(reply.headers ?? {}),
    })
  }
  return { requests, fetch }
}

type TickerResource = [available: string, production: string, limit: string]

type HeaderValues = {
  metal: TickerResource
  crystal: TickerResource
  deuterium: TickerResource
  /**
   * Net supply followed by gross production.
   *
   * 依次为净供给与总产出。
   */
  energy: [available: string, total: string]
}

const TICKER_IDS: Record<string, number> = { metal: 901, crystal: 902, deuterium: 903 }

/**
 * Render the resource ticker outside vacation mode.
 *
 * 渲染非假期模式的资源计数器。
 */
export function tickerHeader(values: HeaderValues): string {
  const stocks = ['metal', 'crystal', 'deuterium'] as const
  const nodes = stocks.map((name) => {
    const [available, , limit] = values[name]
    return `<div class="stock_text"><span id="current_${name}" data-real="${available}">${available}</span>/${limit}</div>`
  })
  const calls = stocks.map((name) => {
    const [available, production, limit] = values[name]
    return (
      `resourceTicker({available: "${available}", limit: [0, "${limit}"], ` +
      `production: "${production}", valueElem: "current_${name}", ` +
      `valuePoursent: "bar_${TICKER_IDS[name]}"}, true);`
    )
  })
  return [
    '<div id="res_nav">',
    ...nodes,
    `<div class="stock_text"><span id="current_energy">${values.energy[0]}</span>/ ${values.energy[1]}</div>`,
    '</div>',
    '<script>',
    ...calls,
    '</script>',
  ].join('')
}

export const DEFAULT_HEADER: string = tickerHeader({
  metal: ['1000', '10', '100000'],
  crystal: ['1000', '10', '100000'],
  deuterium: ['1000', '10', '100000'],
  energy: ['500', '1234'],
})

type PlainResource = [real: string, capacity: string]

/**
 * Vacation mode renders balances without production tickers.
 *
 * 假期模式仅显示余额，不包含产量计数器。
 */
export function plainHeader(values: {
  metal: PlainResource
  crystal: PlainResource
  deuterium: PlainResource
  energy: [available: string, total: string]
}): string {
  const stocks = ['metal', 'crystal', 'deuterium'] as const
  return [
    '<div id="res_nav">',
    ...stocks.map((name) => {
      const [real, capacity] = values[name]
      return [
        `<span id="current_${name}" data-real="${real}">${real}</span>`,
        `<div id="res_block_${name}" data-tooltip-content="<span>${name}</span>` +
          `<span>${real} / ${capacity}</span>"></div>`,
      ].join('')
    }),
    `<div class="stock_text"><span id="current_energy">${values.energy[0]}</span>/ ${values.energy[1]}</div>`,
    '</div>',
  ].join('')
}

/**
 * Render a game page with its planet and optional header.
 *
 * 渲染包含星球标识和可选页头的游戏页面。
 */
export function gamePage(
  content: string,
  options: { planetId?: number; header?: string } = {},
): string {
  const planetId = options.planetId ?? PLANET_ID
  return pageHtml(
    [
      `<span class="active_urlpalnet" url="cp=${planetId}"></span>`,
      '<div class="active_panet"><div class="name_palnet">Homeworld</div>',
      '<div class="coordinates_palnet">[1:2:3]</div></div>',
      options.header ?? '',
      `<div id="content"><div id="ally_content">${content}</div></div>`,
    ].join(''),
  )
}

/**
 * Build a decoded settings form for submission tests.
 *
 * 构造提交测试使用的已解析设置表单。
 */
export function settingsPage(overrides: Partial<AccountSettingsPage> = {}): AccountSettingsPage {
  return {
    kind: 'settings',

    observedAtMs: 1,
    onVacation: false,
    hasLeaveVacationControl: false,
    accountDeletionChecked: false,
    email: 'player@example.com',
    avatarUrl: '',
    backgroundUrl: '',
    timezone: 'UTC',
    planetSort: 0,
    planetOrder: 0,
    probeCount: 1,
    fleetActionLimit: 5,
    queueMessagesEnabled: false,
    hideEmptySpyEntries: false,
    blockPrivateMessages: false,
    galaxySpyEnabled: false,
    galaxyMessagesEnabled: false,
    galaxyBuddyRequestsEnabled: false,
    galaxyMissilesEnabled: false,
    choices: {},
    ...overrides,
  }
}

/**
 * Build alliance settings; the text section defaults to external.
 *
 * 构造联盟设置；文本区默认为对外介绍。
 */
export function allianceSettingsPage(
  overrides: Partial<AllianceAdminOverviewPage> = {},
): AllianceAdminOverviewPage {
  return {
    kind: 'allianceAdminOverview',

    observedAtMs: 1,
    textKind: 'external',
    tag: 'ALLY',
    name: 'The Alliance',
    ownerRankName: 'Leader',
    websiteUrl: '',
    imageUrl: '',
    applicationsClosed: false,
    maximumMembers: 50,
    minimumApplicationPoints: 1000,
    showStatistics: true,
    showDiplomacy: false,
    eventMissions: [],
    text: '',
    choices: {},
    ...overrides,
  }
}

export const GROWTH_MODULE_NAMES: readonly GrowthModule[] = [
  'officer',
  'premium',
  'blueprints',
  'artifact',
  'development',
  'details',
  'minerals',
  'ancientContainerShop',
  'auction',
  'fair',
  'band',
  'race',
  'ethics',
  'government',
  'party',
  'ideologies',
]

export const GROWTH_PAGES: Readonly<Record<GrowthModule, string>> = {
  officer: 'officier',
  premium: 'premium',
  blueprints: 'blueprints',
  artifact: 'artifact',
  development: 'development',
  details: 'details',
  minerals: 'minerals',
  ancientContainerShop: 'bon',
  auction: 'auction',
  fair: 'fair',
  band: 'band',
  race: 'race',
  ethics: 'ethics',
  government: 'formgovernment',
  party: 'party',
  ideologies: 'ideologies',
}

/**
 * Create a session with fake transport and a default test token; an empty token simulates an unauthenticated session.
 *
 * 使用模拟传输创建会话，默认设置测试令牌；空 token 用于未认证场景。
 */
export function sessionOn(
  server: Server,
  options: { sessionToken?: string; forwardedIp?: string } = {},
): Session {
  return new Session({
    baseUrl: BASE_URL,
    universe: UNIVERSE,
    sessionToken: options.sessionToken ?? TOKEN,
    ...(options.forwardedIp === undefined ? {} : { forwardedIp: options.forwardedIp }),
    fetch: server.fetch,
  })
}

/**
 * Build an HTTP response for direct parser tests.
 *
 * 为解析器测试构造 HTTP 响应。
 */
export function httpResponse(
  reply: Reply = {},
  url: string = `${BASE_URL}game.php?page=overview&cp=${PLANET_ID}`,
): HttpResponse {
  return {
    url: new URL(url),
    status: reply.status ?? 200,
    headers: headersFrom(reply.headers ?? {}),
    body: reply.body ?? '',
    observedAtMs: 1,
  }
}

function only(server: Server, index = 0): RecordedRequest {
  assert.ok(server.requests[index], `expected a request at index ${index}`)
  return server.requests[index]
}

function bodyPairs(body: URLSearchParams | null): [string, string][] {
  return [...(body ?? new URLSearchParams())]
}

type ExpectedRequest = {
  method?: 'GET' | 'POST'
  /**
   * Exact URL, including parameter order.
   *
   * 完整 URL，包含参数顺序。
   */
  url?: string
  /**
   * Repeated fields preserve their submission order.
   *
   * 重复字段保留提交顺序。
   */
  body?: [string, string][]
}

function byFieldName(left: readonly [string, string], right: readonly [string, string]): number {
  return left[0].localeCompare(right[0])
}

function expectRequest(request: RecordedRequest, expected: ExpectedRequest): void {
  assert.equal(request.method, expected.method ?? 'GET', 'request method')
  assert.equal(request.redirect, 'manual', 'redirect mode')
  if (expected.url !== undefined) assert.equal(request.url.href, expected.url, 'request URL')
  if (expected.body !== undefined) {
    assert.deepEqual(
      bodyPairs(request.body).toSorted(byFieldName),
      expected.body.toSorted(byFieldName),
      'body',
    )
  } else assert.equal(request.body, null, 'expected no request body')
}

/**
 * Assert request encoding, allowing protocol errors from the configured response.
 *
 * 检查请求编码，允许配置的响应触发协议错误。
 */
export async function expectOperation(
  run: (session: Session) => Promise<unknown>,
  expected: ExpectedRequest,
  replies: Reply | Reply[] = {},
): Promise<Server> {
  const server = fakeServer(replies)
  await run(sessionOn(server)).catch((error: unknown) => {
    if (!(error instanceof OperationError)) throw error
  })
  assert.equal(server.requests.length, 1, 'expected exactly one request')
  expectRequest(only(server), expected)
  return server
}

/**
 * Receipt kinds are distinct from decoded page kinds.
 *
 * 回执类型与已解析页面类型互不重叠。
 */
const RECEIPT_KINDS: ReadonlySet<string> = new Set([
  'message',
  'redirect',
  'json',
  'page',
  'text',
  'empty',
])

function isDocument<T extends { kind: string }>(value: T): value is Exclude<T, Ack> {
  return !RECEIPT_KINDS.has(value.kind)
}

/**
 * Run a reader against a configured response.
 *
 * 使用配置的响应调用读取方法。
 */
export async function decode<T extends { kind: string }>(
  run: (session: Session) => Promise<Observed<T>>,
  response: Reply,
): Promise<Observed<T>> {
  const server = fakeServer(response)
  return run(sessionOn(server))
}

/**
 * Require a decoded document instead of a receipt.
 *
 * 要求返回解析文档而非回执。
 */
export async function read<T extends { kind: string }>(
  run: (session: Session) => Promise<Observed<T>>,
  response: Reply,
): Promise<Exclude<T, Ack>> {
  const server = fakeServer(response)
  const observed = await run(sessionOn(server))
  if (isDocument(observed.data)) return observed.data
  return assert.fail(`expected a document, answered with the ${observed.data.kind} receipt`)
}

/**
 * Return the complete operation result for receipt assertions.
 *
 * 返回完整操作结果以断言回执。
 */
export async function answer<T>(
  run: (session: Session) => Promise<Observed<T>>,
  response: Reply,
): Promise<Observed<T>> {
  const server = fakeServer(response)
  return run(sessionOn(server))
}

/**
 * Assert the complete refusal receipt.
 *
 * 断言完整的拒绝回执。
 */
export async function expectRefusal<T extends { kind: string }>(
  run: (session: Session) => Promise<Observed<PageReply<T>>>,
  message: string,
  planetId?: number,
): Promise<void> {
  const refused = await decode(run, pageReply(gamePage(messageBlock(message))))
  assert.deepEqual(refused.data, {
    kind: 'message',
    message,
    ...(planetId === undefined ? {} : { planetId }),
  })
}

function messageBlock(message: string): string {
  return `<div class="ally_contents">${message}</div>`
}
