import type { Ack, PageReply } from '../../protocol/ack.ts'
import {
  contentText,
  linkUrl,
  oneIn,
  prefixedId,
  requiredAttribute,
  requiredHtml,
  requiredText,
  responseUrl,
  selections,
  textContent,
} from '../../protocol/dom.ts'
import { fieldValue } from '../../protocol/forms.ts'
import { readInteger, readQuantity } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { SpyReport } from '../../protocol/spy-report.ts'
import { readSpyReports } from '../../protocol/spy-report.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'

const OUTBOX_CATEGORY = 999

export type MessageCategory = {
  id: number

  name: string

  unread: number

  total: number

  color: string | null

  handler: string
}

export type GameMessage = {
  id: number

  senderId: number | null

  category: number | null

  subject: string | null

  correspondentText: string

  sentAtText: string

  /**
   * Unread state before messagesView marks incoming messages as read.
   *
   * messagesView 将收件消息标为已读之前的未读状态。
   */
  wasUnread: boolean

  body: string

  bodyHtml: string

  reportIds: string[]

  spyReports: SpyReport[]
}

export type MessageList = {
  category: number

  page: number

  visiblePages: number[]
  messages: GameMessage[]

  markedRead: boolean
}

/**
 * Account messages; the shell may omit the message list until a category is opened.
 *
 * 账号消息；未打开类别时，外层页面可能不包含消息列表。
 */
export type MessagesPage = Observation & {
  kind: 'messages'

  categories: MessageCategory[] | null

  list: MessageList | null
}

function messageCategory(page: Page, handler: string | undefined): number | null {
  if (!handler) return null
  const calls = page.handlerCalls(handler, 'msgArchive')
  const [call] = calls
  return calls.length === 1 && call!.length > 1 ? readInteger(call![1]) : null
}

function readCategories(page: Page): MessageCategory[] {
  return selections(page.$('[id^="mes_"]'))
    .filter((item) => /^mes_\d+$/.test(requiredAttribute(item, 'id')))
    .map((item) => {
      const id = prefixedId(requiredAttribute(item, 'id'), 'mes_')
      const label = item.clone()
      label.children('span').remove()
      return {
        id,
        name: textContent(label).replace(/\s*\/$/, ''),

        unread: readQuantity(oneIn(item, `#unread_${id}`).text()),
        total: readQuantity(oneIn(item, `#total_${id}`).text()),

        color:
          requiredAttribute(item, 'style')
            .match(/;\s*color\s*:\s*([^;]+)/i)?.[1]
            ?.trim() ?? null,
        handler: requiredAttribute(item, 'onclick'),
      }
    })
}

function readList(page: Page): MessageList {
  const category = readInteger(page.fieldValue('messcat'))
  return {
    category,
    page: readInteger(page.fieldValue('side'), 1),
    visiblePages: [
      ...new Set(
        selections(page.$('.message_page_navigation a'))
          .map((item) => textContent(item))
          .filter((item) => /^\d+$/.test(item))
          .map((item) => readInteger(item, 1)),
      ),
    ],

    markedRead: category !== OUTBOX_CATEGORY,
    messages: selections(page.$('.head_row_msg')).map((item) => {
      const head = item.find('.message_head')
      const body = item.find('.message_text')
      const id = readInteger(head.attr('id')?.replace(/^message_/, ''), 1)
      return {
        id,
        senderId: page.handlerId(item.find('[onclick*="Dialog.Buddy"]').attr('onclick'), 'Buddy'),
        category: messageCategory(page, item.find('[onclick*="msgArchive"]').attr('onclick')),
        subject: page.handlerText(
          item.find('[onclick*="CreateAnswer"]').attr('onclick'),
          'CreateAnswer',
        ),
        correspondentText: textContent(item.find('.message_recipient_name')),
        sentAtText: textContent(item.find('.message_time')),
        wasUnread: head.hasClass('mes_unread'),
        body: contentText(body),
        bodyHtml: requiredHtml(body, 'message body'),
        reportIds: selections(body.find('a[href*="page=raport"]')).flatMap(
          (report) => linkUrl(page, report).searchParams.get('raport') ?? [],
        ),
        spyReports: readSpyReports(page, body),
      }
    }),
  }
}

export function readMessages(page: Page): MessagesPage {
  page.one('#mes_100')
  return {
    kind: 'messages',

    ...observation(page),
    categories: readCategories(page),

    list: page.$('.messagestable').length ? readList(page) : null,
  }
}

export function readMessagesList(page: Page): MessagesPage {
  page.one('.messagestable')
  return {
    kind: 'messages',
    ...observation(page),
    categories: page.$('#mes_100').length ? readCategories(page) : null,
    list: readList(page),
  }
}

export function messages(session: Session): Promise<Observed<PageReply<MessagesPage>>> {
  return routePage(session, GAME_ROUTES.messages, {}, readMessages)
}

/**
 * Read one category page and mark the returned incoming messages as read.
 *
 * 读取某类别的一页消息，并将返回的收件消息标为已读。
 */
export function messagesView(
  session: Session,
  options: {
    category: number

    page: number
  },
): Promise<Observed<PageReply<MessagesPage>>> {
  return routePage(
    session,
    GAME_ROUTES.messagesView,
    {
      query: { messcat: options.category, site: options.page, ajax: 1 },
    },
    readMessagesList,
  )
}

export type MessagesComposePage = Observation & {
  kind: 'messagesCompose'

  recipientId: number

  recipientText: string

  subject: string
}

export function readMessagesCompose(page: Page): MessagesComposePage {
  const form = page.one('form[name="message"]')
  return {
    kind: 'messagesCompose',
    ...observation(page),
    recipientId: readInteger(responseUrl(form.attr('action'), page.url).searchParams.get('id'), 1),
    recipientText: requiredText(page.$('.message_recipient_name'), 'message recipient'),
    subject: fieldValue(form, 'subject'),
  }
}

/**
 * Open the compose form and arm the session token for this recipient.
 *
 * 打开写信表单，并为此收件人建立会话发送令牌。
 */
export function messagesWrite(
  session: Session,
  options: { recipientId: number },
): Promise<Observed<PageReply<MessagesComposePage>>> {
  return routePage(
    session,
    GAME_ROUTES.messagesWrite,
    { query: { id: options.recipientId } },
    readMessagesCompose,
  )
}

/**
 * Send after opening messagesWrite for the same recipient; the server consumes its session token.
 *
 * 必须先为同一收件人打开 messagesWrite；发送会消耗服务端的会话令牌。
 */
export function messagesSend(
  session: Session,
  options: {
    recipientId: number
    subject: string
    text: string
  },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.messagesSend, {
    query: { id: options.recipientId, ajax: 1 },
    method: 'POST',
    body: { subject: options.subject, text: options.text },
  })
}

export type MessagesCommand =
  | 'readmarked'
  | 'readtypeall'
  | 'readall'
  | 'deletemarked'
  | 'deleteunmarked'
  | 'deletetypeall'
  | 'deleteall'
  | 'archivemarked'

/**
 * Only readtypeall and deletetypeall filter by category. deleteunmarked deletes all other incoming messages, including archived messages; category only selects its return view.
 *
 * 仅 readtypeall 和 deletetypeall 按 category 筛选。deleteunmarked 删除账号所有未选中的收件消息（含归档），category 仅决定其返回视图。
 */
export type MessagesCommandOptions = {
  category: number
  command: MessagesCommand

  ids?: readonly number[]
}

function messagesSubmission(options: MessagesCommandOptions): URLSearchParams {
  const body = new URLSearchParams({
    ajax: '1',
    messcat: String(options.category),
    submitBottom: '1',
    actionBottom: options.command,
  })
  for (const id of options.ids ?? []) body.set(`messageID[${id}]`, '1')
  return body
}

export function messagesAction(
  session: Session,
  options: MessagesCommandOptions,
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.messagesAction, {
    method: 'POST',
    body: messagesSubmission(options),
  })
}

export function messagesDeleteOne(
  session: Session,
  options: { msgId: number },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.messagesDeleteOne, {
    query: { MsgID: options.msgId, ajax: 1 },
  })
}

export function messagesArchiveOne(
  session: Session,
  options: { msgId: number },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.messagesInArchive, {
    query: { MsgID: options.msgId, ajax: 1 },
  })
}
