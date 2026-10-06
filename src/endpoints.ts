/**
 * Non-page endpoints: images, redirects, cron jobs and notifications.
 *
 * 非页面端点：图片、重定向、定时任务和通知。
 */

import type { Ack } from './protocol/ack.ts'
import type { BinaryResponse } from './protocol/client.ts'
import { readQuantity } from './protocol/numbers.ts'
import { readAck, routeAck } from './protocol/request.ts'
import { observe, OperationError } from './protocol/result.ts'
import type { Observed } from './protocol/result.ts'
import { JSON_ROUTE } from './protocol/routes.ts'
import type { StaticValue } from './protocol/script-data.ts'
import { object } from './protocol/script-data.ts'
import type { Session } from './session.ts'
import { ErrorCode } from './types.ts'

/**
 * Read a player banner, optionally using etag for a conditional request.
 *
 * 读取玩家横幅，可用 etag 发送条件请求。
 *
 * @returns Raw bytes; a cache hit may return 304 with an empty body.
 *
 * 原始字节响应；缓存命中可返回 304 及空正文。
 */
export function playerBanner(
  session: Session,
  options: { playerId: number; etag?: string },
): Promise<BinaryResponse> {
  const url = session.endpoint('userpic.php')
  url.searchParams.set('id', String(options.playerId))
  return session.requestBytes({
    url,
    ...(options.etag === undefined ? {} : { headers: { 'If-None-Match': options.etag } }),
  })
}

/**
 * Read the battle-report redirect without following it.
 *
 * 读取战报重定向，不跟随跳转。
 */
export async function combatReport(
  session: Session,
  options: { reportId: string },
): Promise<Observed<Ack>> {
  const url = session.endpoint('CombatReport.php')
  url.searchParams.set('raport', options.reportId)
  return readAck(session, await session.request({ url }))
}

/**
 * Request execution of the specified due cron job.
 *
 * 请求执行指定的到期任务。
 *
 * @returns The server's byte response; a GIF does not confirm execution.
 *
 * 服务端字节响应；返回 GIF 不保证任务已执行。
 */
export function requestCronjob(
  session: Session,
  options: { cronjobId: number },
): Promise<BinaryResponse> {
  const url = session.endpoint('cronjob.php')
  url.searchParams.set('cronjobID', String(options.cronjobId))
  return session.requestBytes({ url })
}

/**
 * Notification counters and sound flags.
 *
 * 通知计数和声音标记。
 */
export type Notifications = {
  kind: 'notifications'
  /**
   * Incoming attacks, mission 1.
   *
   * 来袭攻击，任务 1。
   */
  attacks: number
  /**
   * Incoming espionage, mission 6.
   *
   * 来袭间谍，任务 6。
   */
  espionage: number
  /**
   * Incoming moon destruction, mission 9.
   *
   * 来袭毁月，任务 9。
   */
  destruction: number
  /**
   * Incoming missiles, mission 10.
   *
   * 来袭导弹，任务 10。
   */
  missiles: number
  /**
   * Unread messages.
   *
   * 未读消息数。
   */
  messages: number
  /**
   * Attack sounds are enabled and attack, destruction or missile counts exceed the submitted counts, which default to zero.
   *
   * 账号启用攻击提示音，且攻击、毁月或导弹数量超过提交计数时为 true；提交计数默认为零。
   */
  attackSound: boolean
  /**
   * Whether the account enables message sounds.
   *
   * 账号是否启用消息提示音。
   */
  messageSound: boolean
}

export function readNotifications(payload: StaticValue): Notifications {
  const data = object(payload)
  if (typeof data.SOUNDATAKS !== 'boolean' || typeof data.SOUNDMSG !== 'boolean')
    throw new OperationError(ErrorCode.ParseError, 'Malformed notification response')
  return {
    kind: 'notifications',
    attacks: readQuantity(data.ataks),
    espionage: readQuantity(data.spio),
    destruction: readQuantity(data.unic),
    missiles: readQuantity(data.rakets),
    messages: readQuantity(data.msg),
    attackSound: data.SOUNDATAKS,
    messageSound: data.SOUNDMSG,
  }
}

/**
 * Read notification counts and account sound settings.
 *
 * 读取通知计数和账号声音设置。
 *
 * @param options Counts from the last observation used to decide attack sounds; omitted counts are treated as zero.
 *
 * 用于判断攻击提示音的上次观测计数；省略项按零处理。
 *
 * @returns Notification data or a server receipt, retaining the original response.
 *
 * 通知数据或服务端回执，均保留原始响应。
 */
export async function notifications(
  session: Session,
  options: { attacks?: number; destruction?: number; missiles?: number } = {},
): Promise<Observed<Ack | Notifications>> {
  const answer = await routeAck(session, JSON_ROUTE, {
    query: {
      ...(options.attacks === undefined ? {} : { ataks: options.attacks }),
      ...(options.destruction === undefined ? {} : { unic: options.destruction }),
      ...(options.missiles === undefined ? {} : { rakets: options.missiles }),
    },
  })
  return observe(answer.response, () =>
    answer.data.kind === 'json' ? readNotifications(answer.data.value) : answer.data,
  )
}
