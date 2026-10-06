import type { Ack, PageReply } from '../../protocol/ack.ts'
import type { Selection } from '../../protocol/dom.ts'
import { requiredLinkId, tableRows, textContent } from '../../protocol/dom.ts'
import { readQuantity } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { OperationError } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type { Observation } from '../../types.ts'

/**
 * Pending registration; dates retain the server display format.
 *
 * 待验证注册记录；日期保留服务端显示格式。
 */
export type AdminPendingAccount = {
  /**
   * Validation ID, also used to delete the pending registration.
   *
   * 注册验证 ID，同时用于删除待验证注册。
   */
  id: number
  name: string
  registeredAtText: string
  email: string
  ip: string

  /**
   * Verification key for publicVerify or publicVerifyJson.
   *
   * 交给 publicVerify 或 publicVerifyJson 的验证密钥。
   */
  validationKey: string
}

export type AdminActivePage = Observation & {
  kind: 'adminActive'

  /**
   * Count stated by the footer, or null when it is ambiguous.
   *
   * 页尾声明的数量；未能唯一识别时为 null。
   */
  total: number | null
  registrations: AdminPendingAccount[]
}

const ACTIVATE_CALL = /activeUser\(\s*\d+\s*,\s*'([^']*)'\s*\)/

function validationKey(status: Selection): string {
  const key = status.find('a').attr('onclick')?.match(ACTIVATE_CALL)?.[1]
  if (key === undefined || key === '')
    throw new OperationError(ErrorCode.ParseError, 'Missing activation key')
  return key
}

export function readAdminActive(page: Page): AdminActivePage {
  const rows = tableRows(page, 'table tbody tr')

  const stated = textContent(page.$('table tbody tr td[colspan]')).match(/\d+/g) ?? []
  return {
    kind: 'adminActive',
    ...observation(page),
    total: stated.length === 1 ? readQuantity(stated[0]) : null,
    registrations: rows.map((row) => {
      const cells = row.children('td')
      return {
        id: requiredLinkId(page, cells.eq(6).find('a')),
        name: textContent(cells.eq(1)),
        registeredAtText: textContent(cells.eq(2)),
        email: textContent(cells.eq(3)),
        ip: textContent(cells.eq(4)),
        validationKey: validationKey(cells.eq(5)),
      }
    }),
  }
}

export function adminActive(session: Session): Promise<Observed<PageReply<AdminActivePage>>> {
  return routePage(session, ADMIN_ROUTES.active, {}, readAdminActive)
}

export function adminActiveDelete(
  session: Session,
  options: { validationId: number },
): Promise<Observed<Ack>> {
  return routeAck(session, ADMIN_ROUTES.active, {
    query: { action: 'delete', id: options.validationId },
  })
}
