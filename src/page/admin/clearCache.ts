import type { Ack } from '../../protocol/ack.ts'
import { routeAck } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'

/**
 * Clear server caches, recalculate cron schedules, and invalidate body economy caches in every universe.
 *
 * 清空服务端缓存、重算定时任务时间，并使所有宇宙的天体经济缓存失效。
 */
export function adminClearCache(session: Session): Promise<Observed<Ack>> {
  return routeAck(session, ADMIN_ROUTES.clearCache, {})
}
