import type { Ack } from '../../protocol/ack.ts'
import { routeAck } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'

export type AdminCredentials = {
  password: string
}

/**
 * Authorize administrative access with the current game account password.
 *
 * 使用当前游戏账号密码授权管理会话。
 */
export function adminLogin(session: Session, options: AdminCredentials): Promise<Observed<Ack>> {
  return routeAck(session, ADMIN_ROUTES.adminLogin, {
    method: 'POST',
    body: { admin_pw: options.password },
  })
}
