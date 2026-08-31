// 薄会话对象：只持有会话（client + token + cookieName + 凭据），不缓存任何游戏状态。
// 所有状态获取方法每次调用都重新抓取页面、DOM 解析、返回格式化数据。
// 核心逻辑是 request() 包装：会话 Cookie 头 + 会话过期时自动重登并重试一次。
import { parse } from 'node-html-parser'
import type { HTMLElement } from 'node-html-parser'
import { Account } from './account'
import type { AccountOptions, LoginResult } from './account'
import { Client } from './client'
import { encodeElementMap } from './utils'
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
import { checkBuildAction, checkFleetStep, checkMissle, extractAllyContents } from './parser/action'
import { parseFleetToken } from './parser/fleet'

export type GameClientOptions = AccountOptions

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

export class GameClient {
  // 凭据与 token 的唯一持有者；token 经 getter 实时读取，自动重登后的新值无需同步
  private readonly account: Account
  // account.client 的别名，便于外部直接透传底层请求
  public readonly client: Client

  get token(): string {
    return this.account.token
  }

  get cookieName(): string {
    return this.account.cookieName
  }

  get ip(): string | undefined {
    return this.account.ip
  }

  constructor(options: GameClientOptions) {
    this.account = new Account(options)
    this.client = this.account.client
  }

  /** 显式登录；内部自动重登时也会调用同一登录逻辑 */
  public login(): Promise<LoginResult> {
    return this.account.login()
  }

  /** 登出并清空会话 token */
  public async logout(): Promise<void> {
    await this.request('GET', { url: '/game.php?page=logout' })
    this.account.token = ''
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
      const result = await this.account.login()
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
      checkBuildAction,
    )
  }

  /** 研究科技：字段名是 tech（与建筑的 building 不同） */
  public buildResearch(options: BuildResearchOptions): Promise<ActionResult> {
    const { planetId, element, count } = options
    return this.postAction(
      `/game.php?page=research&cp=${planetId}`,
      new URLSearchParams({ cmd: 'insert', tech: String(element), lvlup: String(count) }),
      checkBuildAction,
    )
  }

  /** 取消当前科研 */
  public cancelResearch(options: CancelResearchOptions): Promise<ActionResult> {
    const { planetId } = options
    return this.postAction(
      `/game.php?page=research&cp=${planetId}`,
      new URLSearchParams({ cmd: 'cancel' }),
      checkBuildAction,
    )
  }

  /** 船坞生产：body 为原始字符串 fmenge%5B<id>%5D=<count>（中括号已转义） */
  public buildShipyard(options: BuildShipyardOptions): Promise<ActionResult> {
    const { planetId, elements } = options
    return this.postAction(
      `/game.php?page=shipyard&cp=${planetId}`,
      encodeElementMap(elements, 'fmenge[', ']'),
      checkBuildAction,
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
    const step2Result = checkFleetStep(step2)
    if (!step2Result.ok) return step2Result
    const step3 = parse(
      await (
        await this.request('POST', {
          url: `/game.php?page=fleetStep3&cp=${origin}`,
          body: params(),
        })
      ).text(),
    )
    return checkFleetStep(step3)
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
