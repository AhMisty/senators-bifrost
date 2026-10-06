import type { Ack } from '../../protocol/ack.ts'
import { routeAck } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'

/**
 * Read the number of hostile fleets targeting the account.
 *
 * 读取正在向该账号来袭的敌对舰队数量。
 */
export function scan(session: Session): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.scan, {})
}
