import type { Ack, PageReply } from '../../protocol/ack.ts'
import { selectOptions, textContent } from '../../protocol/dom.ts'
import { fieldValue } from '../../protocol/forms.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { FormOption, Observation } from '../../types.ts'

export type AdminBanOrder = 'id' | 'username'

export type AdminBanView = 'all' | 'banned'

export type AdminBanTarget = {
  name: string
  reason: string
  vacation: boolean
}

export type AdminBanPage = Observation & {
  kind: 'adminBan'

  /**
   * Ban candidates; option values are usernames.
   *
   * 可封禁账号；选项值为用户名。
   */
  candidates: FormOption[]

  /**
   * Unban candidates; option values are usernames.
   *
   * 可解封账号；选项值为用户名。
   */
  banned: FormOption[]

  /**
   * Ban form returned by lookup, or null when no form is rendered.
   *
   * 查询到的封禁表单；未显示表单时为 null。
   */
  target: AdminBanTarget | null
}

export function readAdminBan(page: Page): AdminBanPage {
  const panel = page.$('form[name="countt"] > .card')
  const reason = panel.length ? panel.find('textarea[name="why"]') : panel
  return {
    kind: 'adminBan',
    ...observation(page),

    candidates: selectOptions(page, 'select[name="ban_name"]'),
    banned: selectOptions(page, 'select[name="unban_name"]'),
    target: panel.length
      ? {
          name: fieldValue(panel, 'ban_name'),
          reason: textContent(reason),
          vacation: panel.find('input[name="vacat"]').is(':checked'),
        }
      : null,
  }
}

export function adminBan(
  session: Session,
  options: {
    order?: AdminBanOrder
    bannedOrder?: AdminBanOrder
    view?: AdminBanView
  } = {},
): Promise<Observed<PageReply<AdminBanPage>>> {
  const query: Record<string, string | number> = {}
  if (options.order !== undefined) query['order'] = options.order
  if (options.bannedOrder !== undefined) query['order2'] = options.bannedOrder
  if (options.view !== undefined) query['view'] = options.view === 'banned' ? 'bana' : 'all'
  return routePage(session, ADMIN_ROUTES.ban, { query }, readAdminBan)
}

export function adminBanLookup(
  session: Session,
  options: { username: string },
): Promise<Observed<PageReply<AdminBanPage>>> {
  return routePage(
    session,
    ADMIN_ROUTES.ban,
    {
      method: 'POST',
      body: { ban_name: options.username, panel: 1 },
    },
    readAdminBan,
  )
}

export type AdminBanRequest = {
  username: string
  reason: string

  /**
   * Duration with omitted units treated as zero; an existing ban adds its remaining time.
   *
   * 封禁时长；未指定的单位为 0，已有封禁会累加剩余时长。
   */
  duration: { days?: number; hours?: number; minutes?: number; seconds?: number }

  /**
   * Use the server permanent-ban timestamp, 2147483647.
   *
   * 使用服务端永久封禁时间戳 2147483647。
   */
  permanent?: boolean

  /**
   * Whether to enable vacation mode; omission disables it.
   *
   * 是否设置休假模式；省略时关闭休假。
   */
  vacation?: boolean
}

export function adminBanPlace(
  session: Session,
  options: { ban: AdminBanRequest },
): Promise<Observed<Ack>> {
  const { ban } = options
  return routeAck(session, ADMIN_ROUTES.ban, {
    method: 'POST',
    body: {
      ban_name: ban.username,
      why: ban.reason,
      days: ban.duration.days ?? 0,
      hour: ban.duration.hours ?? 0,
      mins: ban.duration.minutes ?? 0,
      secs: ban.duration.seconds ?? 0,
      ...(ban.permanent === true ? { permanent: 1 } : {}),
      ...(ban.vacation === true ? { vacat: 1 } : {}),
      bannow: 1,
    },
  })
}

/**
 * Lift the account ban; the server retains its vacation state.
 *
 * 解除账号封禁，休假状态由服务端保留。
 */
export function adminBanLift(
  session: Session,
  options: { username: string },
): Promise<Observed<Ack>> {
  return routeAck(session, ADMIN_ROUTES.ban, {
    method: 'POST',
    body: { unban_name: options.username },
  })
}
