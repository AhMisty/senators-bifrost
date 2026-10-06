import type { BuddyRequestPage } from '../page/game/buddyList.ts'
import { buddyListRequest, buddyListSend } from '../page/game/buddyList.ts'
import type { MessagesComposePage } from '../page/game/messages.ts'
import { messagesSend, messagesWrite } from '../page/game/messages.ts'
import type { Ack } from '../protocol/ack.ts'
import type { Observed } from '../protocol/result.ts'
import type { Session } from '../session.ts'
import { runMessageOperation } from './message-operation.ts'

export type SendMessageResult =
  | { stage: 'compose'; compose: Observed<Ack> }
  | { stage: 'send'; compose: Observed<MessagesComposePage>; send: Observed<Ack> }

/**
 * Serialize compose and send per Session because New-Star keeps one recipient-bound token.
 *
 * New-Star 每个会话只有一个绑定收件人的令牌，因此按 Session 串行执行写信和发送。
 *
 * @param options - Recipient and content; an omitted subject uses the compose form's subject.
 *
 * 收件人与内容；省略主题时使用写信表单的主题。
 *
 * @returns Reached stage and responses; inspect the send receipt to determine success.
 *
 * 已到达的阶段及响应；应检查发送回执判断是否成功。
 */
export async function sendMessage(
  session: Session,
  options: { recipientId: number; subject?: string; text: string },
): Promise<SendMessageResult> {
  return runMessageOperation(session, () => sendMessageSteps(session, options))
}

async function sendMessageSteps(
  session: Session,
  options: { recipientId: number; subject?: string; text: string },
): Promise<SendMessageResult> {
  const compose = await messagesWrite(session, { recipientId: options.recipientId })
  if (compose.data.kind !== 'messagesCompose')
    return { stage: 'compose', compose: { data: compose.data, response: compose.response } }
  const recipientId = compose.data.recipientId
  const subject = options.subject ?? compose.data.subject
  const sent = await messagesSend(session, { recipientId, subject, text: options.text })
  return {
    stage: 'send',
    compose: { data: compose.data, response: compose.response },
    send: sent,
  }
}

export type SendBuddyRequestResult =
  | { stage: 'request'; request: Observed<Ack> }
  | { stage: 'send'; request: Observed<BuddyRequestPage>; send: Observed<Ack> }

/**
 * Submit a friend request only after receiving its form, using the player ID returned there.
 *
 * 收到好友申请表单后，使用表单返回的玩家 ID 提交申请。
 *
 * @returns Reached stage and responses; inspect the send receipt to determine success.
 *
 * 已到达的阶段及响应；应检查发送回执判断是否成功。
 */
export async function sendBuddyRequest(
  session: Session,
  options: { playerId: number; text: string },
): Promise<SendBuddyRequestResult> {
  const request = await buddyListRequest(session, { playerId: options.playerId })
  if (request.data.kind !== 'buddyRequest')
    return { stage: 'request', request: { data: request.data, response: request.response } }
  const playerId = request.data.playerId
  const sent = await buddyListSend(session, { playerId, text: options.text })
  return {
    stage: 'send',
    request: { data: request.data, response: request.response },
    send: sent,
  }
}
