import type { Ack, PageReply } from '../../protocol/ack.ts'
import { linkUrl, tableRows, textContent } from '../../protocol/dom.ts'
import { displayed, readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'

export type AdminUniverseEntry = {
  id: number
  name: string
  /**
   * Displayed game-speed factor: game_speed / 2500, rounded by the server formatter.
   *
   * 服务端显示的游戏速率倍数：game_speed / 2500，经页面格式化取整。
   */
  gameSpeedFactor: number

  /**
   * Displayed fleet-speed factor: fleet_speed / 2500, rounded by the server formatter.
   *
   * 服务端显示的舰队速率倍数：fleet_speed / 2500，经页面格式化取整。
   */
  fleetSpeedFactor: number
  resourceMultiplier: number
  haltSpeed: number
  energySpeed: number
  users: number
  planets: number
  inactiveUsers: number

  /**
   * Whether the universe permits player logins.
   *
   * 该宇宙是否允许玩家登录。
   */
  open: boolean

  /**
   * Whether the page offers deletion; the root universe does not.
   *
   * 页面是否提供删除操作；根宇宙不提供。
   */
  deletable: boolean
}

export type AdminUniversePage = Observation & {
  kind: 'adminUniverse'
  universes: AdminUniverseEntry[]
  canCreate: boolean
}

export function readAdminUniverse(page: Page): AdminUniversePage {
  return {
    kind: 'adminUniverse',
    ...observation(page),
    canCreate: page.$('a[href*="action=create"]').length > 0,
    universes: tableRows(page, 'table tbody tr').map((row) => {
      const cells = row.children('td')

      const controls = cells.eq(11).find('a')
      return {
        id: readInteger(textContent(cells.eq(0))),
        name: textContent(cells.eq(1)),
        gameSpeedFactor: displayed(textContent(cells.eq(2))),
        fleetSpeedFactor: displayed(textContent(cells.eq(3))),
        resourceMultiplier: displayed(textContent(cells.eq(4))),
        haltSpeed: displayed(textContent(cells.eq(5))),
        energySpeed: displayed(textContent(cells.eq(6))),
        users: displayed(textContent(cells.eq(7))),
        planets: displayed(textContent(cells.eq(8))),
        inactiveUsers: displayed(textContent(cells.eq(9))),
        open: linkUrl(page, controls.first()).searchParams.get('action') === 'closed',
        deletable: controls.length > 1,
      }
    }),
  }
}

export function adminUniverse(session: Session): Promise<Observed<PageReply<AdminUniversePage>>> {
  return routePage(session, ADMIN_ROUTES.universe, {}, readAdminUniverse)
}

export function adminUniverseOpen(
  session: Session,
  options: { universeId: number; open: boolean },
): Promise<Observed<Ack>> {
  return routeAck(session, ADMIN_ROUTES.universe, {
    query: {
      action: options.open ? 'open' : 'closed',
      uniID: options.universeId,
    },
  })
}

/**
 * Request deletion of a universe and its related data; the server protects the root and current universes.
 *
 * 请求删除宇宙及关联数据；服务端不允许删除根宇宙或当前宇宙。
 */
export function adminUniverseDelete(
  session: Session,
  options: { universeId: number },
): Promise<Observed<Ack>> {
  return routeAck(session, ADMIN_ROUTES.universe, {
    query: { action: 'delete', uniID: options.universeId },
  })
}

/**
 * Create a universe and its first administrator; configure its empty default language before using default-language login.
 *
 * 创建宇宙及首位管理员；服务端默认语言为空，须配置后再使用默认语言登录。
 */
export function adminUniverseCreate(session: Session): Promise<Observed<Ack>> {
  return routeAck(session, ADMIN_ROUTES.universe, {
    query: { action: 'create' },
  })
}
