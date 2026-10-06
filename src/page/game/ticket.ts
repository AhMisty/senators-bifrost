import type { Ack, PageReply } from '../../protocol/ack.ts'
import {
  contentText,
  requiredLinkId,
  selectOptions,
  selections,
  textContent,
} from '../../protocol/dom.ts'
import { hasSubmitControl } from '../../protocol/forms.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { OperationError } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { FormOption, Observation } from '../../types.ts'
import { ErrorCode } from '../../types.ts'

export type TicketSummary = {
  id: number
  subject: string

  createdAtText: string

  statusText: string
}

export type TicketsPage = Observation & {
  kind: 'tickets'
  tickets: TicketSummary[]
}

export type TicketCategory = FormOption

export type TicketCreatePage = Observation & {
  kind: 'ticketCreate'

  categories: TicketCategory[]
}

export type TicketPage = Observation & {
  kind: 'ticket'

  id: number

  hasReplyControl: boolean

  answers: {
    author: string

    header: string

    isOwn: boolean
    message: string
  }[]
}

export function readTickets(page: Page): TicketsPage {
  page.one('a[href*="mode=create"]')
  return {
    kind: 'tickets',
    ...observation(page),
    tickets: selections(page.$('.ticket_row_linck')).map((row) => ({
      id: requiredLinkId(page, row),
      subject: textContent(row.find('.ticket_row_linck_subject')),
      createdAtText: textContent(row.find('.ticket_row_linck_time')),
      statusText: textContent(row.find('.ticket_row_linck_status')),
    })),
  }
}

export function readTicketCreate(page: Page): TicketCreatePage {
  page.one('[name="category"]')
  return {
    kind: 'ticketCreate',
    ...observation(page),
    categories: selectOptions(page, '[name="category"]'),
  }
}

export function readTicket(page: Page): TicketPage {
  if (!page.$('.ticket_message').length)
    throw new OperationError(ErrorCode.ParseError, 'Missing ticket answers')
  return {
    kind: 'ticket',
    ...observation(page),
    id: Number(page.parameter('id')),

    hasReplyControl: hasSubmitControl(
      page,
      page.$('form[action*="mode=send"] textarea[name="message"]'),
    ),
    answers: selections(page.$('.ticket_message')).map((answer) => ({
      author: textContent(answer.find('.ticket_message_head_name')),
      header: textContent(answer.find('.ticket_message_head')),
      isOwn: answer.hasClass('ticket_message_owner'),
      message: contentText(answer.find('.ticket_message_text')),
    })),
  }
}

export function ticket(session: Session): Promise<Observed<PageReply<TicketsPage>>> {
  return routePage(session, GAME_ROUTES.ticket, {}, readTickets)
}

export function ticketCreate(session: Session): Promise<Observed<PageReply<TicketCreatePage>>> {
  return routePage(session, GAME_ROUTES.ticketCreate, {}, readTicketCreate)
}

export function ticketView(
  session: Session,
  options: { ticketId: number },
): Promise<Observed<PageReply<TicketPage>>> {
  return routePage(session, GAME_ROUTES.ticketView, { query: { id: options.ticketId } }, readTicket)
}

export type TicketReply = {
  ticketId: number
  text: string
}

export type TicketDraft = {
  categoryId: string
  subject: string
  text: string
}

export function ticketSend(
  session: Session,
  options: TicketReply | TicketDraft,
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.ticketSend, {
    method: 'POST',
    body:
      'ticketId' in options
        ? { id: options.ticketId, message: options.text }
        : { category: options.categoryId, subject: options.subject, message: options.text },
  })
}
