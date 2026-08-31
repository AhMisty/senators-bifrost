// 唯一公开入口类：登录会话 + 全部游戏操作都在 Account 上，一套写法。
// 无本地游戏状态：每个状态方法都重新抓取页面、DOM 解析、返回格式化数据。
// HTTP 层（Client）是内部实现细节，不公开导出；传输层可用 options.fetch 注入自定义实现。
import { parse } from 'node-html-parser'
import type { HTMLElement } from 'node-html-parser'
import { Client } from './client'
import type { Fetch } from './client'
import { DEFAULT_COOKIE_NAME } from './constant'
import { encodeElementMap, extractToken } from './utils'
import type { SendFleetOptions, SendMissleOptions } from './fleet'
import type {
  ActionResult,
  BuildingsData,
  ControlData,
  ElementMap,
  ResearchData,
  ShipyardData,
} from './types'
import { parseBuildings } from './parser/buildings'
import { parseControl } from './parser/control'
import { parseResearch } from './parser/research'
import { parseShipyard } from './parser/shipyard'
import { checkAllyError, checkMissle, extractAllyContents } from './parser/action'
import { parseFleetToken } from './parser/fleet'

export type AccountOptions = {
  base: string
  // 请求超时（毫秒），默认 10000；0 表示立即中止。无「禁用超时」开关，可用 Number.MAX_SAFE_INTEGER 近似
  timeout?: number
  // 自定义 fetch 实现，默认 globalThis.fetch（传输层唯一注入点）
  fetch?: Fetch
  universe: number
  username: string
  password: string
  // 会话 cookie 名，默认取全局常量 DEFAULT_COOKIE_NAME
  cookieName?: string
  // 可选的反检测 IP（如随机 IPv4），配置后作为 Forwarded 头发送；未配置则不发送该头
  ip?: string
}

export type LoginResult =
  | { ok: true; token: string; response: Response }
  | {
      ok: false
      // 服务器完全没发 Set-Cookie（典型凭据错误页）；还是发了但没有匹配 cookieName 的 cookie
      reason: 'no-set-cookie' | 'cookie-not-found'
      response: Response
    }

export type BuildBuildingOptions = {
  planetId: number
  element: number
  // 升级级数（lvlup 字段语义：一次性升几级）
  count: number
}

export type BuildResearchOptions = {
  planetId: number
  element: number
  count: number
}

export type CancelResearchOptions = {
  planetId: number
}

export type BuildShipyardOptions = {
  planetId: number
  // 舰船元素 id → 数量
  elements: ElementMap
}

export class Account {
  // token 存本类字段，自动重登后实时生效
  private readonly client: Client
  public readonly universe: number
  public readonly username: string
  public readonly password: string
  public readonly cookieName: string
  public readonly ip?: string
  // 登录成功后写入的会话 token；失败时保留旧值
  public token: string = ''

  constructor(options: AccountOptions) {
    this.client = new Client({ base: options.base, timeout: options.timeout, fetch: options.fetch })
    this.universe = options.universe
    this.username = options.username
    this.password = options.password
    this.cookieName = options.cookieName ?? DEFAULT_COOKIE_NAME
    this.ip = options.ip
  }

  /** 登录：POST /index.php?page=login，从 Set-Cookie 提取会话 token */
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

  /** 登出并清空会话 token */
  public async logout(): Promise<void> {
    await this.request('GET', { url: '/game.php?page=logout' })
    this.token = ''
  }

  // 游戏请求包装：组装会话头并处理会话过期重登。
  // 所有游戏请求强制 redirect: 'manual'——服务器过期时返回 302 指向 /index.php，必须看到 Location 才能触发重登。
  // 重登成功只重试一次（retried 标志防死循环），重登失败抛错。
  private async request(
    method: 'GET' | 'POST',
    options: { url: string; body?: RequestInit['body'] },
    retried = false,
  ): Promise<Response> {
    const headers: RequestInit['headers'] = {
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(this.ip === undefined ? {} : { Forwarded: this.ip }),
      Cookie: this.token ? `${this.cookieName}=${this.token};` : '',
    }
    const response =
      method === 'GET'
        ? await this.client.get({ url: options.url, headers, redirect: 'manual' })
        : await this.client.post({
            url: options.url,
            body: options.body,
            headers,
            redirect: 'manual',
          })
    const location = response.headers.get('Location')
    if (
      location &&
      new URL(location, this.client.base).pathname.startsWith('/index.php') &&
      !retried
    ) {
      const result = await this.login()
      if (!result.ok) throw new Error(`会话已过期且自动重登失败（${result.reason}）`)
      return this.request(method, options, true)
    }
    return response
  }

  private async getHtml(url: string): Promise<string> {
    return (await this.request('GET', { url })).text()
  }

  private async postAction(
    url: string,
    body: string | URLSearchParams,
    check: (root: HTMLElement) => ActionResult,
  ): Promise<ActionResult> {
    const response = await this.request('POST', { url, body })
    return check(parse(await response.text()))
  }

  /** 全局面板：玩家 id、特殊资源、161 项元素总量、行星列表（含每星球元素值） */
  public async getControl(): Promise<ControlData> {
    return parseControl(await this.getHtml('/game.php?page=control'))
  }

  /** 科研页：科技等级与科研队列 */
  public async getResearch(): Promise<ResearchData> {
    return parseResearch(await this.getHtml('/game.php?page=research'))
  }

  /** 建筑页：建筑等级、能源、存储上限、建造队列 */
  public async getBuildings(planetId: number): Promise<BuildingsData> {
    return parseBuildings(await this.getHtml(`/game.php?page=buildings&cp=${planetId}`))
  }

  /** 船坞页：舰船/防御数量、能源、存储上限、生产队列 */
  public async getShipyard(planetId: number): Promise<ShipyardData> {
    return parseShipyard(await this.getHtml(`/game.php?page=shipyard&cp=${planetId}`))
  }

  /** 建造/升级建筑：cmd=insert&building=<element>&lvlup=<count> */
  public buildBuilding(options: BuildBuildingOptions): Promise<ActionResult> {
    const { planetId, element, count } = options
    return this.postAction(
      `/game.php?page=buildings&cp=${planetId}`,
      new URLSearchParams({ cmd: 'insert', building: String(element), lvlup: String(count) }),
      checkAllyError,
    )
  }

  /** 研究科技：字段名是 tech（与建筑的 building 不同） */
  public buildResearch(options: BuildResearchOptions): Promise<ActionResult> {
    const { planetId, element, count } = options
    return this.postAction(
      `/game.php?page=research&cp=${planetId}`,
      new URLSearchParams({ cmd: 'insert', tech: String(element), lvlup: String(count) }),
      checkAllyError,
    )
  }

  /** 取消当前科研 */
  public cancelResearch(options: CancelResearchOptions): Promise<ActionResult> {
    const { planetId } = options
    return this.postAction(
      `/game.php?page=research&cp=${planetId}`,
      new URLSearchParams({ cmd: 'cancel' }),
      checkAllyError,
    )
  }

  /** 船坞生产：body 为原始字符串 fmenge%5B<id>%5D=<count>（中括号已转义） */
  public buildShipyard(options: BuildShipyardOptions): Promise<ActionResult> {
    const { planetId, elements } = options
    return this.postAction(
      `/game.php?page=shipyard&cp=${planetId}`,
      encodeElementMap(elements, 'fmenge[', ']'),
      checkAllyError,
    )
  }

  /** 派遣舰队：三步流程。第一步提交编制并提取 CSRF token，第二/三步提交目标与参数 */
  public async sendFleet(options: SendFleetOptions): Promise<ActionResult> {
    const { origin, target, mission, speed, staytime, metal, crystal, deuterium, ships } = options
    const step1Response = await this.request('POST', {
      url: `/game.php?page=fleetStep1&cp=${origin}`,
      body: encodeElementMap(ships, 'ship', ''),
    })
    const step1Root = parse(await step1Response.text())
    const token = parseFleetToken(step1Root)
    if (!token) {
      const ally = extractAllyContents(step1Root)
      return { ok: false, error: ally ?? '未找到舰队 token（fleetStep1 响应异常）' }
    }
    const params = () =>
      new URLSearchParams({
        galaxy: String(target.galaxy),
        system: String(target.system),
        planet: String(target.planet),
        type: String(target.type),
        mission: String(mission),
        speed: String(speed),
        staytime: String(staytime),
        metal: String(metal),
        crystal: String(crystal),
        deuterium: String(deuterium),
        token,
      })
    const step2 = parse(
      await (
        await this.request('POST', {
          url: `/game.php?page=fleetStep2&cp=${origin}`,
          body: params(),
        })
      ).text(),
    )
    const step2Result = checkAllyError(step2)
    if (!step2Result.ok) return step2Result
    const step3 = parse(
      await (
        await this.request('POST', {
          url: `/game.php?page=fleetStep3&cp=${origin}`,
          body: params(),
        })
      ).text(),
    )
    return checkAllyError(step3)
  }

  /** 发射星际导弹：body 含目标坐标、SendMI 数量与 Target 优先级 */
  public async sendMissle(options: SendMissleOptions): Promise<ActionResult> {
    const { origin, target, count, firstTarget } = options
    return this.postAction(
      `/game.php?page=fleetMissile&cp=${origin}`,
      new URLSearchParams({
        galaxy: String(target.galaxy),
        system: String(target.system),
        planet: String(target.planet),
        type: String(target.type),
        SendMI: String(count),
        Target: String(firstTarget),
      }),
      checkMissle,
    )
  }
}
