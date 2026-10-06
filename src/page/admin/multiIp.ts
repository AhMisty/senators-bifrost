import type { Ack, PageReply } from '../../protocol/ack.ts'
import type { Selection } from '../../protocol/dom.ts'
import { linkUrl, selections, textContent } from '../../protocol/dom.ts'
import { readAt, readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'

/**
 * Account sharing an IP; dates retain the server display format.
 *
 * 共享 IP 的账号；日期保留服务端显示格式。
 */
export type AdminSharedAddressAccount = {
  id: number
  name: string
  email: string
  registeredAtText: string
  onlineAtText: string

  /**
   * An administrator has marked this account as a known shared-IP account.
   *
   * 管理员已将该账号标为已知共享 IP。
   */
  known: boolean
}

export type AdminSharedAddressGroup = {
  ip: string
  accounts: AdminSharedAddressAccount[]
}

export type AdminMultiIpPage = Observation & {
  kind: 'adminMultiIp'
  groups: AdminSharedAddressGroup[]
}

const RECORD_CELLS = 6

export function readAdminMultiIp(page: Page): AdminMultiIpPage {
  return {
    kind: 'adminMultiIp',
    ...observation(page),
    groups: selections(page.$('table tbody')).map((group) => {
      const cells: Selection[] = []
      for (const row of selections(group.find('tr'))) {
        const found = row.children('td')
        found.each((_index, cell) => {
          cells.push(page.$(cell))
        })
      }
      const accounts: AdminSharedAddressAccount[] = []
      for (let at = 1; at + RECORD_CELLS <= cells.length; at += RECORD_CELLS) {
        const record = cells.slice(at, at + RECORD_CELLS)
        accounts.push({
          id: readInteger(textContent(record[0]!)),
          name: textContent(record[1]!),
          email: textContent(record[2]!),
          registeredAtText: textContent(record[3]!),
          onlineAtText: textContent(record[4]!),
          known: linkUrl(page, record[5]!.find('a')).searchParams.get('action') === 'unknown',
        })
      }
      return { ip: textContent(readAt(cells, 0)), accounts }
    }),
  }
}

export function adminMultiIp(session: Session): Promise<Observed<PageReply<AdminMultiIpPage>>> {
  return routePage(session, ADMIN_ROUTES.multiIp, {}, readAdminMultiIp)
}

export function adminMultiIpMark(
  session: Session,
  options: { playerId: number; known: boolean },
): Promise<Observed<Ack>> {
  return routeAck(session, ADMIN_ROUTES.multiIp, {
    query: {
      action: options.known ? 'known' : 'unknown',
      id: options.playerId,
    },
  })
}
