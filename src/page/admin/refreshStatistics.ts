import type { Ack } from '../../protocol/ack.ts'
import { routeAck } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'

/**
 * Rebuild statistics for every universe in the installation.
 *
 * 重建整个安装实例中所有宇宙的统计数据。
 */
export function adminRefreshStatistics(session: Session): Promise<Observed<Ack>> {
  return routeAck(session, ADMIN_ROUTES.refreshStatistics, {})
}
