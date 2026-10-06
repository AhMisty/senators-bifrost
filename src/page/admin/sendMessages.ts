import type { Ack, PageReply } from '../../protocol/ack.ts'
import { selectOptions } from '../../protocol/dom.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import { readChoice } from '../../protocol/values.ts'
import type { Session } from '../../session.ts'
import type { FormOption, Observation } from '../../types.ts'

const CHANNELS = [0, 1, 2] as const
export type AdminBroadcastChannel = (typeof CHANNELS)[number]

export type AdminSendMessagesPage = Observation & {
  kind: 'adminSendMessages'
  channels: FormOption<AdminBroadcastChannel>[]
  languages: FormOption[]
}

export function readAdminSendMessages(page: Page): AdminSendMessagesPage {
  return {
    kind: 'adminSendMessages',
    ...observation(page),
    channels: selectOptions(page, 'select[name="key"]').map(({ value, label }) => ({
      value: readChoice(value, CHANNELS, 'broadcast channel'),
      label,
    })),
    languages: selectOptions(page, 'select[name="globalmessagelang"]'),
  }
}

export function adminSendMessages(
  session: Session,
): Promise<Observed<PageReply<AdminSendMessagesPage>>> {
  return routePage(session, ADMIN_ROUTES.sendMessages, {}, readAdminSendMessages)
}

export type AdminBroadcast = {
  /**
   * Delivery channel: 0 for game messages, 1 for email, or 2 for both; use a value offered by channels.
   *
   * 投递渠道：0 为游戏消息，1 为邮件，2 为两者；可用值取自 channels。
   */
  channel: AdminBroadcastChannel
  subject: string

  /**
   * The server replaces {USERNAME} in the body with each recipient name.
   *
   * 正文中的 {USERNAME} 由服务端替换为收件人名称。
   */
  text: string

  /**
   * Omission leaves recipient language unrestricted.
   *
   * 省略时不按语言筛选收件人。
   */
  language?: string
}

/**
 * Broadcast to all accounts in the current universe matching the language filter.
 *
 * 向当前宇宙中符合语言筛选的所有账号发送广播。
 */
export function adminSendMessagesSend(
  session: Session,
  options: { broadcast: AdminBroadcast },
): Promise<Observed<Ack>> {
  const { broadcast } = options
  return routeAck(session, ADMIN_ROUTES.sendMessages, {
    query: { action: 'send' },
    method: 'POST',
    body: {
      key: broadcast.channel,
      subject: broadcast.subject,
      text: broadcast.text,
      globalmessagelang: broadcast.language ?? '',
    },
  })
}
