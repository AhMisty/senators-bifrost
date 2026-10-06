import type { PageReply } from '../../protocol/ack.ts'
import { selections } from '../../protocol/dom.ts'
import { readQuantity } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type { Observation } from '../../types.ts'

export type AdminOverviewStatistics = {
  backups: number
  users: number

  /**
   * Accounts beyond the server inactivity threshold.
   *
   * 超过服务端不活跃期限未登录的账号数。
   */
  inactiveUsers: number

  /**
   * Accounts seen within the last half hour.
   *
   * 最近半小时登录过的账号数。
   */
  onlineUsers: number
  planets: number

  /**
   * Tickets awaiting an administrator reply.
   *
   * 待管理员答复的工单数。
   */
  openTickets: number
  logEntries: number

  /**
   * Enabled jobs across the installation.
   *
   * 整个安装实例中启用的定时任务数。
   */
  activeCronjobs: number

  /**
   * News entries across the installation.
   *
   * 整个安装实例中的新闻条目数。
   */
  newsEntries: number
}

export type AdminOverviewPage = Observation & {
  kind: 'adminOverview'
  statistics: AdminOverviewStatistics
}

const STATISTIC_COUNT = 9

export function readAdminOverview(page: Page): AdminOverviewPage {
  const badges = selections(page.$('.list-group-item .badge')).map((badge) =>
    readQuantity(badge.text().trim()),
  )
  if (badges.length !== STATISTIC_COUNT)
    throw new OperationError(
      ErrorCode.ParseError,
      `Expected ${STATISTIC_COUNT} overview figures, found ${badges.length}`,
    )
  return {
    kind: 'adminOverview',
    ...observation(page),
    statistics: {
      backups: badges[0]!,
      users: badges[1]!,
      inactiveUsers: badges[2]!,
      onlineUsers: badges[3]!,
      planets: badges[4]!,
      openTickets: badges[5]!,
      logEntries: badges[6]!,
      activeCronjobs: badges[7]!,
      newsEntries: badges[8]!,
    },
  }
}

export function adminOverview(session: Session): Promise<Observed<PageReply<AdminOverviewPage>>> {
  return routePage(session, ADMIN_ROUTES.overview, {}, readAdminOverview)
}
