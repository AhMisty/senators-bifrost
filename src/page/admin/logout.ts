import type { Ack } from '../../protocol/ack.ts'
import { routeAck } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'

/**
 * End administrative access while retaining the game session.
 *
 * 结束管理权限，保留游戏会话。
 */
export function adminLogout(session: Session): Promise<Observed<Ack>> {
  return routeAck(session, ADMIN_ROUTES.logout, {})
}
