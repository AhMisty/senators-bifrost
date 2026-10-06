import type { PageReply } from '../../protocol/ack.ts'
import { addressParams } from '../../protocol/coordinates.ts'
import type { FleetOption } from '../../protocol/fleet-forms.ts'
import { readFleetOptions } from '../../protocol/fleet-forms.ts'
import { requiredFieldValue } from '../../protocol/forms.ts'
import { readFleetMission } from '../../protocol/missions.ts'
import type { FleetMission } from '../../protocol/missions.ts'
import { readAmount, readDecimal, readInteger } from '../../protocol/numbers.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import { object } from '../../protocol/script-data.ts'
import type { FleetSpeed } from '../../protocol/values.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type { Location, PlanetObservation, PlanetReference } from '../../types.ts'

/**
 * Available missions and holding choices for one prepared destination.
 *
 * 指定目标可用的任务及驻留选项。
 */
export type FleetStep2Page = PlanetObservation & {
  kind: 'fleetStep2'

  token: string

  missions: FleetOption<FleetMission>[]

  stayOptions: FleetOption[]

  sectors: FleetOption[]

  /**
   * Cargo capacity before flight fuel is deducted.
   *
   * 扣除飞行燃料前的载货容量。
   */
  capacity: number

  fuel: number
}

export function readFleetStep2(page: Page): FleetStep2Page {
  const missions = readFleetOptions(page, 'mission', readFleetMission)
  if (!missions.length) throw new OperationError(ErrorCode.ParseError, 'Missing dispatch missions')
  const data = object(page.scripts.binding('data', 'last'))
  return {
    kind: 'fleetStep2',
    ...planetObservation(page),
    token: requiredFieldValue(page.form('fleetStep3'), 'token'),
    missions,
    stayOptions: readFleetOptions(page, 'staytime', (value) => readInteger(value, 1)),
    sectors: readFleetOptions(page, 'sectors', (value) => readInteger(value, 1)),
    capacity: readDecimal(data.fleetroom),
    fuel: readAmount(data.consumption),
  }
}

/**
 * Prepare the destination with the token returned by fleetStep1.
 *
 * 使用 fleetStep1 返回的令牌设置目标。
 */
export function fleetStep2(
  session: Session,
  options: {
    origin: PlanetReference

    token: string

    target: Location

    speed: FleetSpeed

    /**
     * ACS group to join; omission clears the draft group.
     *
     * 要加入的联合攻击组；省略时清除草稿中的组。
     */
    fleetGroupId?: number | undefined
  },
): Promise<Observed<PlanetData<PageReply<FleetStep2Page>>>> {
  const { origin, target, speed, fleetGroupId, token } = options
  return routePage(
    session,
    GAME_ROUTES.fleetStep2,
    {
      planetId: origin.planetId,
      method: 'POST',
      body: {
        ...addressParams(target),
        type: target.type,
        speed,

        fleet_group: fleetGroupId ?? 0,
        token,
      },
    },
    readFleetStep2,
  )
}
