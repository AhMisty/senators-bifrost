import type { Ack } from '../../protocol/ack.ts'
import { readAck, routeResponse } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'

export async function logout(session: Session): Promise<Observed<Ack>> {
  const response = await routeResponse(session, GAME_ROUTES.logout, {})
  session.sessionToken = ''
  return readAck(session, response)
}
