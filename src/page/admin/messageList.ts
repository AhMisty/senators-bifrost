import type { PageReply } from '../../protocol/ack.ts'
import type { Selection } from '../../protocol/dom.ts'
import {
  contentText,
  integerOptions,
  requiredAttribute,
  requiredHtml,
  selections,
  textContent,
} from '../../protocol/dom.ts'
import { controlValue } from '../../protocol/forms.ts'
import { readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { FormOption, Observation } from '../../types.ts'

export type AdminMessageFilter = {
  /**
   * Message category; omission or 100 selects all categories.
   *
   * 消息类别；省略或 100 表示全部类别。
   */
  category?: number
  sender?: string
  receiver?: string

  /**
   * Page numbers start at 1.
   *
   * 页码从 1 开始。
   */
  page?: number
  from?: AdminMessageDate

  /**
   * The server applies the end date only when from is also provided.
   *
   * 服务端仅在同时提供 from 时应用结束日期。
   */
  to?: AdminMessageDate
}

export type AdminMessageDate = { day: number; month: number; year: number }

export type AdminMessageEntry = {
  id: number

  /**
   * Message category from its column or active filter; null for an ambiguous category label.
   *
   * 消息类别，取自类别列或当前筛选；类别名称不唯一时为 null。
   */
  category: number | null

  /**
   * Sent time in the server display format.
   *
   * 发送时间，保留服务端显示格式。
   */
  sentAtText: string
  sender: string
  receiver: string
  subject: string
  deleted: boolean

  /**
   * Plain message text retaining line and paragraph boundaries.
   *
   * 消息正文纯文本，保留换行与段落边界。
   */
  text: string

  /**
   * Message-body HTML returned by the server.
   *
   * 服务端返回的正文 HTML。
   */
  bodyHtml: string
}

export type AdminMessageListPage = Observation & {
  kind: 'adminMessageList'
  category: number

  /**
   * Current page number, starting at 1.
   *
   * 当前页码，从 1 开始。
   */
  page: number

  /**
   * Number of matching pages; 1 when there are no results.
   *
   * 匹配页数；没有结果时为 1。
   */
  pageCount: number
  entries: AdminMessageEntry[]
}

const GOTO_PAGE = /gotoPage\((\d+)\)/g

function pageCount(page: Page): number {
  const asked: number[] = []
  for (const link of selections(page.$('th.right').first().find('a')))
    for (const found of requiredAttribute(link, 'onclick').matchAll(GOTO_PAGE))
      asked.push(readInteger(found[1]))
  return asked.length === 0 ? 1 : Math.max(...asked)
}

export function readAdminMessageList(page: Page): AdminMessageListPage {
  const form = page.one('form[action*="page=messageList"]')
  const category = readInteger(controlValue(form.find('select[name="type"]')))

  /**
   * Category cells contain localized names; use the filter to recover their IDs.
   *
   * 类别单元格仅含本地化名称，使用筛选器恢复类别编号。
   */
  const categories = integerOptions(page.$('select[name="type"]'))
  return {
    kind: 'adminMessageList',
    ...observation(page),
    category,
    page: readInteger(form.find('input[name="side"]').attr('value'), 1),
    pageCount: pageCount(page),
    entries: selections(page.$('tr[data-messageID]')).map((row) =>
      readMessageRow(page, row, category, categories),
    ),
  }
}

function readMessageRow(
  page: Page,
  row: Selection,
  category: number,
  categories: readonly FormOption<number>[],
): AdminMessageEntry {
  const cells = row.children('td')

  const id = readInteger(row.attr('data-messageid'))

  const wide = cells.length > 5
  const named = categories.filter((entry) => entry.label === textContent(cells.eq(1)))
  const body = page.$(`#contentID${String(id)}`).children('td')
  const [onlyNamed] = named
  return {
    id,
    category: wide ? (named.length === 1 ? onlyNamed!.value : null) : category,
    sentAtText: textContent(cells.eq(wide ? 2 : 1)),
    sender: textContent(cells.eq(wide ? 3 : 2)),
    receiver: textContent(cells.eq(wide ? 4 : 3)),
    subject: textContent(cells.eq(wide ? 5 : 4)),
    deleted: cells.eq(wide ? 5 : 4).find('img[data-tooltip-content]').length > 0,
    text: contentText(body),
    bodyHtml: requiredHtml(body, 'message body'),
  }
}

export function adminMessageList(
  session: Session,
  options: { filter?: AdminMessageFilter } = {},
): Promise<Observed<PageReply<AdminMessageListPage>>> {
  const filter = options.filter ?? {}
  const query: Record<string, string | number> = {}
  if (filter.page !== undefined) query['side'] = filter.page
  if (filter.category !== undefined) query['type'] = filter.category
  if (filter.sender !== undefined) query['sender'] = filter.sender
  if (filter.receiver !== undefined) query['receiver'] = filter.receiver
  for (const [name, date] of [
    ['dateStart', filter.from],
    ['dateEnd', filter.to],
  ] as const)
    if (date !== undefined)
      for (const [part, value] of Object.entries(date)) query[`${name}[${part}]`] = value
  return routePage(session, ADMIN_ROUTES.messageList, { query }, readAdminMessageList)
}
