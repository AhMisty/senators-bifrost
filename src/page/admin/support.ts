import type { Ack, PageReply } from '../../protocol/ack.ts'
import type { Selection } from '../../protocol/dom.ts'
import {
  contentText,
  requiredAttribute,
  requiredLinkId,
  selections,
  textContent,
} from '../../protocol/dom.ts'
import { fieldValue } from '../../protocol/forms.ts'
import { readInteger, readQuantity } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'

export type AdminTicketStatus = 'open' | 'answered' | 'closed'

export type AdminTicketSummary = {
  id: number
  ownerName: string
  subject: string

  /**
   * Reply count excluding the opening message.
   *
   * 不含首条提问的答复数量。
   */
  replies: number

  /**
   * Creation time in the server display format.
   *
   * 创建时间，保留服务端显示格式。
   */
  openedAtText: string
  status: AdminTicketStatus
}

export type AdminSupportPage = Observation & {
  kind: 'adminSupport'
  tickets: AdminTicketSummary[]
}

export type AdminTicketReply = {
  subject: string
  /**
   * Plain body text retaining line and paragraph boundaries.
   *
   * 正文纯文本，保留换行与段落边界。
   */
  message: string

  /**
   * Author and time as displayed on the page.
   *
   * 页面显示的作者及时间。
   */
  byline: string
}

export type AdminTicketPage = Observation & {
  kind: 'adminTicket'
  id: number

  /**
   * Status-toggle label; it describes the available action rather than the current state.
   *
   * 切换状态按钮的文本；表示可执行操作而非当前状态。
   */
  statusLabel: string
  /**
   * All messages in chronological order, including the opening question and status changes.
   *
   * 按时间排列的全部消息，包含首条提问及状态变更记录。
   */
  replies: AdminTicketReply[]
}

/**
 * The second table body lists closed tickets; colors distinguish open and answered tickets in the first.
 *
 * 第二个表体列出已关闭工单；首个表体以颜色区分待答复和已答复。
 */
function rowStatus(row: Selection, bodyIndex: number): AdminTicketStatus {
  if (bodyIndex > 0) return 'closed'
  return requiredAttribute(row.children('td').eq(5).find('span'), 'style').includes('orange')
    ? 'answered'
    : 'open'
}

export function readAdminSupport(page: Page): AdminSupportPage {
  const tickets: AdminTicketSummary[] = []

  page.$('table tbody').each((bodyIndex, node) => {
    page
      .$(node)
      .find('tr')
      .each((_rowIndex, rowNode) => {
        const row = page.$(rowNode)
        const cells = row.children('td')
        if (cells.length === 0) return
        tickets.push({
          id: requiredLinkId(page, cells.eq(0).find('a')),
          ownerName: textContent(cells.eq(1)),
          subject: textContent(cells.eq(2)),
          replies: readQuantity(textContent(cells.eq(3))),
          openedAtText: textContent(cells.eq(4)),
          status: rowStatus(row, bodyIndex),
        })
      })
  })
  return { kind: 'adminSupport', ...observation(page), tickets }
}

export function readAdminTicket(page: Page): AdminTicketPage {
  const form = page.one('form[action*="mode=send"]')
  return {
    kind: 'adminTicket',
    ...observation(page),
    id: readInteger(fieldValue(form, 'id'), 1),
    statusLabel: textContent(form.find('label[for="Check"]')),
    replies: selections(page.$('.media')).map((reply) => {
      const body = reply.find('.media-body').clone()
      body.children('h5').first().remove()
      body.children('p').last().remove()
      return {
        subject: textContent(reply.find('h5')),
        message: contentText(body),
        byline: textContent(reply.find('small')),
      }
    }),
  }
}

export function adminSupport(session: Session): Promise<Observed<PageReply<AdminSupportPage>>> {
  return routePage(session, ADMIN_ROUTES.support, {}, readAdminSupport)
}

export function adminSupportView(
  session: Session,
  options: { ticketId: number },
): Promise<Observed<PageReply<AdminTicketPage>>> {
  return routePage(
    session,
    ADMIN_ROUTES.supportView,
    { query: { id: options.ticketId } },
    readAdminTicket,
  )
}

/**
 * Reply to a ticket; a normal reply marks it answered, even when it was closed.
 *
 * 答复工单；普通回复将状态设为已答复，即使工单已关闭。
 *
 * @param options - With changeStatus true, close an unclosed ticket or mark a closed ticket answered; text is optional.
 *
 * changeStatus 为 true 时关闭未关闭的工单，或将已关闭工单设为已答复；可不提供正文。
 */
export function adminSupportSend(
  session: Session,
  options: { ticketId: number; text?: string; changeStatus?: boolean },
): Promise<Observed<Ack>> {
  return routeAck(session, ADMIN_ROUTES.supportSend, {
    method: 'POST',
    body: {
      id: options.ticketId,
      ...(options.text === undefined ? {} : { message: options.text }),
      ...(options.changeStatus === true ? { change_status: 1 } : {}),
    },
  })
}
