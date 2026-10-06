import type { Ack } from '../../protocol/ack.ts'
import { routeAck } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'

export function chat(session: Session): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.chat, {})
}
