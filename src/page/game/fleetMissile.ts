import type { Ack } from '../../protocol/ack.ts'
import { addressParams } from '../../protocol/coordinates.ts'
import { routeAck } from '../../protocol/request.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Location, PlanetReference } from '../../types.ts'

/**
 * Launch missiles; the server limits the amount to silo stock.
 *
 * 发射导弹；服务端将数量限制为导弹井库存。
 */
export function fleetMissile(
  session: Session,
  options: {
    origin: PlanetReference

    target: Location

    amount: number

    /**
     * Defense element ID; omission or zero lets the strike choose targets.
     *
     * 防御设施元素 ID；省略或零表示自动选择目标。
     */
    primaryTargetId?: number
  },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.fleetMissile, {
    planetId: options.origin.planetId,
    method: 'POST',
    body: {
      ...addressParams(options.target),
      type: options.target.type,
      SendMI: options.amount,
      Target: options.primaryTargetId ?? 0,
    },
  })
}
