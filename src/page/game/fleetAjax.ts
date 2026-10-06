import type { Ack } from '../../protocol/ack.ts'
import type { FleetMission } from '../../protocol/missions.ts'
import { readAmount, readInteger, readQuantity } from '../../protocol/numbers.ts'
import { routeAck } from '../../protocol/request.ts'
import { observe, OperationError, ServerError } from '../../protocol/result.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { StaticValue } from '../../protocol/script-data.ts'
import { object } from '../../protocol/script-data.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type { ElementMap, Observation, PlanetReference } from '../../types.ts'

/**
 * Quick dispatch supports only espionage and recycling.
 *
 * 快速派遣仅支持侦察和回收。
 */
export type QuickFleetMission = (typeof FleetMission)['Spy'] | (typeof FleetMission)['Recycling']

/**
 * Successful quick dispatch; the response does not identify the origin planet.
 *
 * 快速派遣成功结果；响应不包含起点星球 ID。
 */
export type FleetAjaxPage = Observation & {
  kind: 'fleetAjax'

  code: 600

  message: string

  activeSlots: number

  /**
   * Remaining stock for the dispatched ship types.
   *
   * 本次派遣涉及舰种的剩余库存。
   */
  remainingShips: ElementMap
}

export function readFleetAjax(payload: StaticValue, observedAtMs: number): FleetAjaxPage {
  const data = object(payload)
  if (typeof data.mess !== 'string')
    throw new OperationError(ErrorCode.ParseError, 'Missing quick fleet message')
  const code = readInteger(data.code)
  if (code !== 600) throw new ServerError(data.mess, code)
  return {
    kind: 'fleetAjax',

    observedAtMs,
    code,
    message: data.mess,
    activeSlots: readQuantity(data.slots),
    remainingShips: new Map(
      Object.entries(object(data.ships)).map(([id, amount]) => [
        readInteger(id, 1),
        readAmount(amount),
      ]),
    ),
  }
}

/**
 * Dispatch espionage probes or recyclers using the server-selected ships and quantity.
 *
 * 使用服务端选择的舰种和数量派遣间谍探测器或回收舰。
 *
 * @returns A fleetAjax success result, or the server's non-JSON receipt.
 *
 * fleetAjax 成功结果，或服务端返回的非 JSON 回执。
 *
 * @throws {ServerError} When the JSON dispatch code is not 600.
 *
 * JSON 派遣状态码不是 600 时抛出。
 */
export async function fleetAjax(
  session: Session,
  options: {
    origin: PlanetReference

    mission: QuickFleetMission

    target: PlanetReference
  },
): Promise<Observed<Ack | FleetAjaxPage>> {
  const answer = await routeAck(
    session,
    GAME_ROUTES.fleetAjax,
    {
      planetId: options.origin.planetId,
      query: { ajax: 1 },
      method: 'POST',
      body: { mission: options.mission, planetID: options.target.planetId },
    },
    false,
  )
  return observe(answer.response, () =>
    answer.data.kind === 'json'
      ? readFleetAjax(answer.data.value, answer.response.observedAtMs)
      : answer.data,
  )
}
