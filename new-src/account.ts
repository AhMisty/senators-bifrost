// 会话与登录模块：取代旧 config（会话 cookie 名）与 Operator.login 的职责。
// 持有会话状态（cookie 名、会话 token），并通过 Client 发起登录请求。
// client 与 base 二选一（判别联合）：注入 client 时使用其自带 base 与 fetch 实现；
// 只给 base 时自动构造使用 globalThis.fetch 的默认 client。
import { Client } from './client'
import { DEFAULT_COOKIE_NAME } from './constant'
import { extractToken } from './utils'

export type AccountOptions = {
  universe: number
  username: string
  password: string
  cookieName?: string
  ip?: string
} & ({ client: Client; base?: never } | { base: string; client?: never })

export type LoginResult =
  | { ok: true; token: string; response: Response }
  | {
      ok: false
      // 服务器完全没发 Set-Cookie（典型凭据错误页）；还是发了但没有匹配 cookieName 的 cookie
      reason: 'no-set-cookie' | 'cookie-not-found'
      response: Response
    }

export class Account {
  public readonly client: Client
  public readonly universe: number
  public readonly username: string
  public readonly password: string
  public readonly cookieName: string
  public readonly ip?: string
  // 登录成功后写入的会话 token；失败时保留旧值
  public token: string = ''

  constructor(options: AccountOptions) {
    this.universe = options.universe
    this.username = options.username
    this.password = options.password
    this.cookieName = options.cookieName ?? DEFAULT_COOKIE_NAME
    this.ip = options.ip
    if (options.client) {
      this.client = options.client
    } else {
      this.client = new Client({ base: options.base })
    }
  }

  public async login(): Promise<LoginResult> {
    const response = await this.client.post({
      url: '/index.php?page=login',
      body: new URLSearchParams({
        uni: String(this.universe),
        username: this.username,
        password: this.password,
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(this.ip === undefined ? {} : { Forwarded: this.ip }),
      },
      // 必须 manual：登录成功时服务器返回 302，会话 token 就在该 302 的 Set-Cookie 上；
      // 'follow' 模式会跟随重定向并丢弃中间响应的 Set-Cookie，导致取不到 token。
      // manual 模式下 302 原样返回，成功后不要跟随 Location（会话已建立）。
      redirect: 'manual',
    })
    const token = extractToken(response.headers, this.cookieName)
    if (token === null) {
      return {
        ok: false,
        reason: response.headers.getSetCookie().length > 0 ? 'cookie-not-found' : 'no-set-cookie',
        response,
      }
    }
    this.token = token
    return { ok: true, token, response }
  }
}
