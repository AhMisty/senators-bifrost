import type { FleetStep1Page } from '../page/game/fleetStep1.ts'
import { fleetStep1 } from '../page/game/fleetStep1.ts'
import type { FleetStep2Page } from '../page/game/fleetStep2.ts'
import { fleetStep2 } from '../page/game/fleetStep2.ts'
import type { FleetStep3Page } from '../page/game/fleetStep3.ts'
import { fleetStep3 } from '../page/game/fleetStep3.ts'
import type { Ack, PageReply } from '../protocol/ack.ts'
import type { HttpResponse } from '../protocol/client.ts'
import type { FleetMission } from '../protocol/missions.ts'
import { ServerError } from '../protocol/result.ts'
import type { Observed, PlanetData } from '../protocol/result.ts'
import type { FleetSpeed } from '../protocol/values.ts'
import type { Session } from '../session.ts'
import type { ElementInput, Location, PlanetReference, ResourceInput } from '../types.ts'

export type DispatchFleetOptions = {
  origin: PlanetReference
  ships: ElementInput
  target: Location

  speed: FleetSpeed
  mission: FleetMission
  fleetGroupId?: number | undefined
  cargo?: ResourceInput | undefined
  stayOption?: number | undefined
  sector?: number | undefined
}

/**
 * The final reached stage and all earlier observations; the stage alone does not confirm dispatch.
 *
 * 最后到达的阶段及此前所有观察结果；阶段本身不代表派遣成功。
 */
export type DispatchFleetResult =
  | { stage: 'draft'; draft: Observed<PlanetData<Ack>> }
  | {
      stage: 'destination'
      draft: Observed<PlanetData<FleetStep1Page>>
      destination: Observed<PlanetData<Ack>>
    }
  | {
      stage: 'dispatch'
      draft: Observed<PlanetData<FleetStep1Page>>
      destination: Observed<PlanetData<FleetStep2Page>>
      dispatch: Observed<PlanetData<PageReply<FleetStep3Page>>>
    }

/**
 * An unowned cp silently keeps the server active planet; stop before dispatching from the wrong origin.
 *
 * 不属于账号的 cp 会被服务端静默忽略；发现起点不符时停止，避免从错误星球派遣。
 */
function checkOrigin(expected: number, actual: number, response: HttpResponse): void {
  if (actual !== expected)
    throw new ServerError(
      `Requested origin planet ${expected}, but the server selected ${actual}`,
      'planet-mismatch',
      response,
    )
}

/**
 * Create, prepare and submit one draft sequentially with the server's tokens.
 *
 * 依次创建、设置并提交一个草稿，各步骤使用服务端返回的令牌。
 *
 * @returns Reached stage and responses; a fleetStep3 document confirms dispatch.
 *
 * 已到达的阶段及响应；fleetStep3 文档表示派遣成功。
 *
 * @throws {ServerError} When a draft or destination selects a different origin planet.
 *
 * 草稿或目标设置页面选中的起点星球与请求不符时抛出。
 */
export async function dispatchFleet(
  session: Session,
  options: DispatchFleetOptions,
): Promise<DispatchFleetResult> {
  const origin = { planetId: options.origin.planetId }
  const draft = await fleetStep1(session, { origin, ships: options.ships })
  if (draft.data.kind !== 'fleetStep1')
    return { stage: 'draft', draft: { data: draft.data, response: draft.response } }
  checkOrigin(origin.planetId, draft.data.planetId, draft.response)
  const draftToken = draft.data.token

  const destination = await fleetStep2(session, {
    origin,
    token: draftToken,
    target: options.target,
    speed: options.speed,
    fleetGroupId: options.fleetGroupId,
  })
  if (destination.data.kind !== 'fleetStep2')
    return {
      stage: 'destination',
      draft: { data: draft.data, response: draft.response },
      destination: { data: destination.data, response: destination.response },
    }
  checkOrigin(origin.planetId, destination.data.planetId, destination.response)
  const destinationToken = destination.data.token

  const dispatch = await fleetStep3(session, {
    origin,
    token: destinationToken,
    mission: options.mission,
    cargo: options.cargo,
    stayOption: options.stayOption,
    sector: options.sector,
  })
  return {
    stage: 'dispatch',
    draft: { data: draft.data, response: draft.response },
    destination: { data: destination.data, response: destination.response },
    dispatch,
  }
}
