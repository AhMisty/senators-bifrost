import type { PageReply } from '../../protocol/ack.ts'
import { adminMenuCards } from '../../protocol/admin-forms.ts'
import { requiredLinkId, selections, tableRows, textContent } from '../../protocol/dom.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { PageRoute } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'

export type AdminLogKind = 'planets' | 'players' | 'settings' | 'present'

export type AdminLogOffering = {
  kind: AdminLogKind
  title: string
}

export type AdminLogPage = Observation & {
  kind: 'adminLog'
  logs: AdminLogOffering[]
}

/**
 * Administrative audit entry; time retains the server display format.
 *
 * 管理操作日志；时间保留服务端显示格式。
 */
export type AdminLogEntry = {
  id: number
  admin: string
  universe: string

  /**
   * Displayed target: planet and owner, account, or universe label.
   *
   * 操作对象的显示文本：星球及其主人、账号或宇宙标签。
   */
  target: string
  atText: string
}

export type AdminLogListPage = Observation & {
  kind: 'adminLogList'
  log: AdminLogKind
  entries: AdminLogEntry[]
}

export type AdminLogChange = {
  /**
   * Field name in the server language.
   *
   * 字段名称，按服务端语言显示。
   */
  element: string

  before: string
  after: string
}

/**
 * Details of an administrative action; time retains the server display format.
 *
 * 单条管理操作详情；时间保留服务端显示格式。
 */
export type AdminLogDetailPage = Observation & {
  kind: 'adminLogDetail'
  admin: string
  universe: string
  atText: string
  changes: AdminLogChange[]
}

const LOG_KINDS: Readonly<Record<string, AdminLogKind>> = {
  planet: 'planets',
  player: 'players',
  settings: 'settings',
  present: 'present',
}

const LOG_ROUTES: Readonly<Record<AdminLogKind, PageRoute>> = {
  planets: ADMIN_ROUTES.logPlanetsList,
  players: ADMIN_ROUTES.logPlayersList,
  settings: ADMIN_ROUTES.logSettingsList,
  present: ADMIN_ROUTES.logPresent,
}

export function readAdminLog(page: Page): AdminLogPage {
  return {
    kind: 'adminLog',
    ...observation(page),
    logs: adminMenuCards(page, 'type').flatMap(({ value, title }) => {
      const kind = LOG_KINDS[value]
      return kind === undefined ? [] : [{ kind, title }]
    }),
  }
}

export function readAdminLogList(page: Page, log: AdminLogKind): AdminLogListPage {
  return {
    kind: 'adminLogList',
    log,
    ...observation(page),
    entries: tableRows(page, 'table tbody tr').map((row) => {
      const cells = row.children('td')
      return {
        id: requiredLinkId(page, cells.eq(5).find('a')),
        admin: textContent(cells.eq(1)),
        universe: textContent(cells.eq(2)),
        target: textContent(cells.eq(3)),
        atText: textContent(cells.eq(4)),
      }
    }),
  }
}

export function readAdminLogDetail(page: Page): AdminLogDetailPage {
  const tables = page.$('table')
  const header = tables.eq(0).find('tbody tr td')
  return {
    kind: 'adminLogDetail',
    ...observation(page),
    admin: textContent(header.eq(0)),
    universe: textContent(header.eq(1)),
    atText: textContent(header.eq(2)),
    changes: selections(tables.eq(1).find('tbody tr')).map((row) => {
      const cells = row.children('td')
      return {
        element: textContent(cells.eq(0)),
        before: textContent(cells.eq(1)),
        after: textContent(cells.eq(2)),
      }
    }),
  }
}

export function adminLog(session: Session): Promise<Observed<PageReply<AdminLogPage>>> {
  return routePage(session, ADMIN_ROUTES.log, {}, readAdminLog)
}

export function adminLogDetail(
  session: Session,
  options: { logId: number },
): Promise<Observed<PageReply<AdminLogDetailPage>>> {
  return routePage(
    session,
    ADMIN_ROUTES.logDetail,
    { query: { id: options.logId } },
    readAdminLogDetail,
  )
}

/**
 * Read administrative audit entries of the selected kind, newest first.
 *
 * 按类别读取管理操作日志，最新记录在前。
 */
export function adminLogList(
  session: Session,
  options: { log: AdminLogKind },
): Promise<Observed<PageReply<AdminLogListPage>>> {
  return routePage(session, LOG_ROUTES[options.log], {}, (page) =>
    readAdminLogList(page, options.log),
  )
}
