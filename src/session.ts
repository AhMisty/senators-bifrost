import type { Ack } from './protocol/ack.ts'
import { ackOf } from './protocol/ack.ts'
import { Client, isRedirect } from './protocol/client.ts'
import type {
  BinaryResponse,
  ClientOptions,
  HttpResponse,
  ResponseHead,
} from './protocol/client.ts'
import { responseUrl } from './protocol/dom.ts'
import { parsePage } from './protocol/page.ts'
import { deleteParameters, encodeParameters } from './protocol/parameters.ts'
import { observe, ValidationError, ServerError } from './protocol/result.ts'
import type { Observed } from './protocol/result.ts'
import { PUBLIC_ROUTES, carriesUniverse, ownedParameters } from './protocol/routes.ts'
import type { PageRoute } from './protocol/routes.ts'
import type { RequestParameters } from './types.ts'

export type LoginCredentials = { username: string; password: string; language?: string }
export type LoginOverrides = Partial<LoginCredentials> & { universe?: number }
type MissingLoginFields<Defaults> = ([Defaults] extends [{ username: string }]
  ? {}
  : { username: string }) &
  ([Defaults] extends [{ password: string }] ? {} : { password: string })
/**
 * Login calls must supply credentials omitted from constructor defaults.
 *
 * 构造参数缺少的凭证必须由 login 调用补充。
 */
export type LoginArguments<Defaults> = keyof MissingLoginFields<Defaults> extends never
  ? [options?: LoginOverrides]
  : [options: LoginOverrides & MissingLoginFields<Defaults>]

type LoginSettings = LoginCredentials & { universe: number }

/**
 * Top-level endpoint scripts provided by the installation.
 *
 * 当前安装提供的顶层接口脚本。
 */
export type EndpointFile =
  | 'game.php'
  | 'index.php'
  | 'json.php'
  | 'admin.php'
  | 'userpic.php'
  | 'CombatReport.php'
  | 'cronjob.php'

type SessionRequestBase = {
  url: URL

  /**
   * Whether to send the session cookie; disabling it allows requests outside the installation.
   *
   * 是否发送会话 Cookie；禁用后可请求安装目录之外的地址。
   */
  withCookie?: boolean | undefined

  /**
   * Additional headers; Session owns Cookie, X-Forwarded-For and POST Content-Type.
   *
   * 附加请求头；Cookie、X-Forwarded-For 和 POST Content-Type 由 Session 管理。
   */
  headers?: Readonly<Record<string, string>>
}

export type SessionRequestOptions = SessionRequestBase &
  ({ method?: 'GET'; body?: never } | { method: 'POST'; body?: URLSearchParams })

/**
 * Automatic login requires explicit opt-in and credentials; callers coordinate tokens and credentials.
 *
 * 自动登录显式开启时必须提供凭证；token 与凭证的一致性由调用方负责。
 */
export type SessionOptions = ClientOptions & {
  universe: number
  sessionToken?: string

  /**
   * X-Forwarded-For address sent only to this installation.
   *
   * 仅向本安装发送的 X-Forwarded-For 地址。
   */
  forwardedIp?: string
} & ((LoginCredentials & { autoLogin: true }) | (Partial<LoginCredentials> & { autoLogin?: false }))

/**
 * Login confirmed by a session cookie together with a game redirect.
 *
 * 由会话 Cookie 与游戏重定向共同确认的登录结果。
 */
export type LoginData = { kind: 'login'; sessionToken: string }

/**
 * Decode and normalize paths to keep cookies within the installation.
 *
 * 解码并规范化路径，确保 Cookie 留在安装目录内。
 */
function installationPath(url: URL): string | null {
  let path: string
  try {
    path = decodeURIComponent(url.pathname)
  } catch (error) {
    if (!(error instanceof URIError)) throw error
    return null
  }
  const resolved: string[] = []
  for (const segment of path.replaceAll('\\', '/').split('/')) {
    if (segment === '.') continue

    if (segment === '..') {
      if (resolved.length > 1) resolved.pop()
      continue
    }
    resolved.push(segment)
  }
  return resolved.join('/')
}

function cookieToken(headers: Headers): string | null {
  let token: string | null = null
  for (const cookie of headers.getSetCookie()) {
    const [pair = ''] = cookie.split(';', 1)
    const separator = pair.indexOf('=')
    if (pair.slice(0, separator).trim() === '2Moons')
      token = pair.slice(separator + 1).trim() || null
  }
  return token
}

/**
 * Requests and login defaults for one installation; callers coordinate concurrency and identity changes.
 *
 * 同一安装的请求与登录默认值；会话并发和身份切换由调用方协调。
 */
export class Session<Defaults extends SessionOptions = SessionOptions> {
  private readonly client: Client
  private loginDefaults: {
    universe: number
    username: string | undefined
    password: string | undefined
    language: string | undefined
  }
  private readonly forwardedIp?: string | undefined

  private readonly installation: string
  /**
   * Freely replaceable session token; changing it does not update login credentials.
   *
   * 可直接替换的会话令牌，不修改登录凭证。
   */
  sessionToken: string
  /**
   * Log in when the token is absent; after explicit expiry retry this request once without rebuilding workflows.
   *
   * 缺 token 时先登录；明确过期后登录并重试当前请求一次，不重建工作流。
   */
  readonly autoLogin: boolean
  private recoveryLogin: Promise<void> | undefined

  constructor(options: Defaults) {
    this.client = new Client(options)

    if (!this.client.baseUrl.pathname.endsWith('/'))
      throw new ValidationError('baseUrl must be a directory address ending in /')

    const installation = installationPath(this.client.baseUrl)
    if (installation === null) throw new ValidationError('Unreadable baseUrl path')
    this.installation = installation
    this.loginDefaults = {
      universe: options.universe,
      username: options.username,
      password: options.password,
      language: options.language,
    }
    this.sessionToken = options.sessionToken ?? ''
    this.autoLogin = options.autoLogin ?? false
    this.forwardedIp = options.forwardedIp
  }

  get universe(): number {
    return this.loginDefaults.universe
  }
  get baseUrl(): URL {
    return this.client.baseUrl
  }

  /**
   * Resolve an existing response's redirect target without making a request.
   *
   * 解析已有响应的重定向目标，不发送请求。
   *
   * @returns The target resolved against the response URL, or null for a non-redirect or an absent Location header.
   *
   * 相对于响应地址解析的目标；非重定向或没有 Location 时为 null。
   *
   * @throws {OperationError} Location cannot be resolved as a URL.
   *
   * Location 无法解析为 URL。
   */
  location(response: ResponseHead): URL | null {
    const location = response.headers.get('Location')
    if (!isRedirect(response) || !location) return null
    return responseUrl(location, response.url)
  }

  /**
   * Check whether a response redirects to a named endpoint in this installation.
   *
   * 判断响应是否重定向到本安装指定接口。
   */
  redirectsTo(response: ResponseHead, file: EndpointFile): boolean {
    return this.isEndpoint(this.location(response), file)
  }

  private isEndpoint(target: URL | null, file: EndpointFile): boolean {
    return (
      target?.origin === this.baseUrl.origin && target.pathname === this.endpoint(file).pathname
    )
  }

  endpoint(file: EndpointFile): URL {
    return new URL(file, this.baseUrl)
  }

  private insideInstallation(url: URL): boolean {
    if (url.origin !== this.client.baseUrl.origin) return false
    const target = installationPath(url)
    return target !== null && target.startsWith(this.installation)
  }

  /**
   * Build a route URL with route-owned fields taking precedence over caller query parameters.
   *
   * 构造路由地址；路由固定字段优先于调用方查询参数。
   */
  pageUrl(route: PageRoute, planetId?: number, extra?: RequestParameters): URL {
    const url = new URL(route.path, this.baseUrl)
    if (extra !== undefined) url.search = encodeParameters(extra).toString()
    deleteParameters(url.searchParams, ownedParameters(route, planetId), true)
    url.searchParams.delete('page')
    url.searchParams.delete('mode')
    for (const [name, value] of Object.entries(route.query ?? {})) url.searchParams.set(name, value)
    if (route.page !== undefined) url.searchParams.set('page', route.page)
    if (planetId !== undefined) url.searchParams.set('cp', String(planetId))
    if (route.mode !== undefined) url.searchParams.set('mode', route.mode)
    if (carriesUniverse(route)) url.searchParams.set('uni', String(this.universe))
    return url
  }

  private send(options: SessionRequestOptions): {
    method: 'GET' | 'POST'
    url: URL
    headers: NonNullable<RequestInit['headers']>
    body: URLSearchParams | undefined
  } {
    const { url, method = 'GET', body, withCookie = true, headers } = options
    const inside = (withCookie || this.forwardedIp !== undefined) && this.insideInstallation(url)
    if (withCookie && !inside)
      throw new ValidationError('Authenticated request is outside the installation')
    const callerHeaders = Object.fromEntries(
      Object.entries(headers ?? {}).filter(([name]) => {
        const key = name.toLowerCase()
        return (
          key !== 'cookie' &&
          key !== 'x-forwarded-for' &&
          (method !== 'POST' || key !== 'content-type')
        )
      }),
    )
    return {
      method,
      url,
      headers: {
        ...callerHeaders,
        ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        ...(inside && this.forwardedIp !== undefined
          ? { 'X-Forwarded-For': this.forwardedIp }
          : {}),
        ...(withCookie && this.sessionToken ? { Cookie: `2Moons=${this.sessionToken}` } : {}),
      },
      body,
    }
  }

  /**
   * Read a text response with session-cookie and optional automatic-login policies.
   *
   * 读取文本响应，应用会话 Cookie 与可选自动登录策略。
   *
   * @returns The complete response without business decoding, retaining unfollowed redirects.
   *
   * 未解码业务内容的完整响应，保留未跟随的重定向。
   *
   * @throws {ValidationError} The URL leaves the installation while session cookies are enabled.
   *
   * 启用会话 Cookie 时地址越出安装目录。
   *
   * @throws {ServerError} HTTP status is at least 400, or automatic login returns an unconfirmed receipt.
   *
   * HTTP 状态码至少为 400，或自动登录返回未确认回执。
   */
  async request(options: SessionRequestOptions): Promise<HttpResponse> {
    return this.authenticatedRequest(options, () => {
      const { method, url, headers, body } = this.send(options)
      return this.client.request(method, url, headers, body)
    })
  }

  /**
   * Retain response bytes using the same session policies.
   *
   * 保留响应字节，应用相同的会话策略。
   *
   * @returns Undecoded response bytes, status and headers; redirects are not followed.
   *
   * 未解码的响应字节、状态和头部；重定向不跟随。
   */
  async requestBytes(options: SessionRequestOptions): Promise<BinaryResponse> {
    return this.authenticatedRequest(options, () => {
      const { method, url, headers, body } = this.send(options)
      return this.client.requestBytes(method, url, headers, body)
    })
  }

  private requiresAuthentication(options: SessionRequestOptions): boolean {
    if (options.withCookie === false) return false
    const url = options.url
    const name = url.pathname.slice(this.baseUrl.pathname.length)
    return (
      this.insideInstallation(url) &&
      ['game.php', 'admin.php', 'json.php', 'cronjob.php', 'CombatReport.php'].includes(name) &&
      !(name === 'game.php' && url.searchParams.get('page') === 'logout')
    )
  }
  private async authenticatedRequest<Body extends string | Uint8Array>(
    options: SessionRequestOptions,
    send: () => Promise<HttpResponse<Body>>,
  ): Promise<HttpResponse<Body>> {
    if (!this.requiresAuthentication(options)) return send()
    if (this.recoveryLogin) await this.recoveryLogin
    if (!this.sessionToken && this.autoLogin) await this.automaticAuthenticate()
    const token = this.sessionToken
    const response = await send()
    if (!this.autoLogin) return response
    const target = this.location(response)
    if (target?.searchParams.get('code') !== '3' || !this.isEndpoint(target, 'index.php'))
      return response
    /**
     * Reuse a renewed session for delayed expiry responses to retain its workflow state.
     *
     * 迟到的过期响应应复用已更新的会话，避免丢失新会话中的工作流状态。
     */
    if (this.sessionToken === token) await this.automaticAuthenticate()
    return send()
  }

  /**
   * Concurrent automatic logins share one in-flight request; completion permits another attempt.
   *
   * 并发自动登录共享一个进行中的请求，结束后允许下一次尝试。
   */
  private async automaticAuthenticate(): Promise<void> {
    if (this.recoveryLogin) return this.recoveryLogin
    const promise = this.loginOnce(this.resolveLogin({})).then((result) => {
      if (result.data.kind !== 'login')
        throw new ServerError(
          'Authentication was not confirmed',
          'login-unconfirmed',
          result.response,
        )
    })
    this.recoveryLogin = promise
    try {
      await promise
    } finally {
      this.recoveryLogin = undefined
    }
  }

  /**
   * Confirm and adopt the response token while retaining existing login defaults.
   *
   * 确认并接管响应中的 token；保持已有登录默认值。
   *
   * @returns Login data when a session cookie accompanies a redirect to this installation's game.php; otherwise a server receipt.
   *
   * 同时设置会话 Cookie 并跳转至本安装 game.php 时返回登录结果，否则返回服务端回执。
   */
  confirmLogin(response: HttpResponse): Ack | LoginData {
    const token = cookieToken(response.headers)
    if (token && this.redirectsTo(response, 'game.php')) {
      this.sessionToken = token
      return { kind: 'login', sessionToken: token }
    }
    return ackOf(this, response, () => parsePage(response))
  }

  private resolveLogin(overrides: LoginOverrides): LoginSettings {
    const language = overrides.language ?? this.loginDefaults.language

    return {
      universe: overrides.universe ?? this.loginDefaults.universe,
      username: overrides.username ?? this.loginDefaults.username!,
      password: overrides.password ?? this.loginDefaults.password!,
      ...(language === undefined ? {} : { language }),
    }
  }

  /**
   * Log in with defaults and overrides, retaining these login settings only after confirmation.
   *
   * 使用默认值及显式覆盖登录，仅在确认成功后保存这些登录参数。
   *
   * @returns Confirmed login data or another server receipt, with the response; promise fulfillment does not imply successful login.
   *
   * 登录确认结果或其他服务端回执，均附原始响应；Promise 完成不等于登录成功。
   */
  login(...[overrides = {}]: LoginArguments<Defaults>): Promise<Observed<Ack | LoginData>> {
    return this.loginOnce(this.resolveLogin(overrides))
  }
  private async loginOnce(credentials: LoginSettings): Promise<Observed<Ack | LoginData>> {
    const { username, password } = credentials
    const url = this.pageUrl(
      PUBLIC_ROUTES.login,
      undefined,
      credentials.language === undefined ? undefined : { lang: credentials.language },
    )
    url.searchParams.set('uni', String(credentials.universe))
    const response = await this.request({
      url,
      method: 'POST',
      body: new URLSearchParams({ username, password }),
      withCookie: false,
    })
    const result = observe(response, () => this.confirmLogin(response))
    if (result.data.kind === 'login') {
      this.loginDefaults = {
        universe: credentials.universe,
        username: credentials.username,
        password: credentials.password,
        language: credentials.language,
      }
    }
    return result
  }
}
