import type { Ack } from '../../protocol/ack.ts'
import type { PublicPageOptions } from '../../protocol/public-options.ts'
import { publicPageQuery } from '../../protocol/public-options.ts'
import { routeAck } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { PUBLIC_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'

/**
 * Read the server forum redirect response.
 *
 * 读取服务端论坛跳转响应。
 */
export function publicBoard(
  session: Session,
  options: PublicPageOptions = {},
): Promise<Observed<Ack>> {
  return routeAck(session, PUBLIC_ROUTES.board, { query: publicPageQuery(options) })
}
