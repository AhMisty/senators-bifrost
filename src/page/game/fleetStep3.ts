import type { PageReply } from '../../protocol/ack.ts'
import { coordinate } from '../../protocol/coordinates.ts'
import {
  ELEMENT_ICON_SELECTOR,
  elementId,
  oneIn,
  requiredText,
  selections,
} from '../../protocol/dom.ts'
import type { FleetMission } from '../../protocol/missions.ts'
import { displayed, readAmount, readQuantity } from '../../protocol/numbers.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type {
  Coordinate,
  ElementMap,
  PlanetObservation,
  PlanetReference,
  ResourceInput,
} from '../../types.ts'

export type FleetStep3Page = PlanetObservation & {
  kind: 'fleetStep3'

  missionText: string

  origin: Coordinate

  target: Coordinate

  ships: ElementMap

  fuel: number

  /**
   * Localized target arrival time; the server labels both time fields alike.
   *
   * 本地化的目标抵达时间；服务端为两个时间字段使用相同标签。
   */
  targetArrivalTimeText: string

  /**
   * Localized fleet end time; it does not imply a return flight.
   *
   * 本地化的舰队结束时间，不代表一定返航。
   */
  endTimeText: string

  speed: number

  distance: number
}

export function readFleetStep3(page: Page): FleetStep3Page {
  const panel = page.one('#content #ally_content > .fleettab16')
  const origins = panel.find('.fleetstep1-5 .fleetstep1-10')
  const targets = panel.find('.fleetstep1-9 .fleetstep1-11')
  const mission = panel.find('.fleetstep1-3 .fleetstep1-10')
  const missionText = mission.text().trim()
  if (mission.length !== 1 || !missionText)
    throw new OperationError(ErrorCode.ParseError, 'Missing fleet receipt mission')
  if (origins.length !== 2 || targets.length !== 2)
    throw new OperationError(ErrorCode.ParseError, 'Incomplete fleet receipt')
  const ships: ElementMap = new Map()
  for (const item of selections(panel.siblings('.alleanza1'))) {
    const image = item.find(ELEMENT_ICON_SELECTOR)
    const count = item.find('.fleettab15')
    if (image.length !== 1 || count.length !== 1)
      throw new OperationError(ErrorCode.ParseError, 'Invalid fleet receipt ships')
    const id = elementId(image.attr('src'))
    if (ships.has(id))
      throw new OperationError(ErrorCode.ParseError, 'Duplicate fleet receipt ship')
    ships.set(id, readQuantity(displayed(count.text()), 1))
  }
  if (!ships.size) throw new OperationError(ErrorCode.ParseError, 'Fleet receipt has no ships')
  return {
    kind: 'fleetStep3',
    ...planetObservation(page),
    missionText,
    origin: coordinate(origins.eq(1).text()),
    target: coordinate(targets.eq(1).text()),
    ships,
    fuel: readQuantity(displayed(origins.eq(0).text())),
    targetArrivalTimeText: requiredText(
      oneIn(panel, '.fleetstep1-4 .fleetstep1-10'),
      'fleet target arrival time',
    ),
    endTimeText: requiredText(oneIn(panel, '.fleetstep1-7 .fleetstep1-11'), 'fleet end time'),
    speed: readAmount(displayed(oneIn(panel, '.fleetstep1-6 .fleetstep1-11').text())),
    distance: readAmount(displayed(targets.eq(0).text())),
  }
}

/**
 * Submit a prepared draft; the server validates the mission and may clamp cargo to available stock.
 *
 * 提交已准备的草稿；服务端校验任务，并可能将货物数量限制为现有库存。
 */
export function fleetStep3(
  session: Session,
  options: {
    origin: PlanetReference

    token: string

    mission: FleetMission

    cargo?: ResourceInput | undefined

    /**
     * A staytime option value from fleetStep2, not a duration in seconds.
     *
     * fleetStep2 返回的 staytime 选项值，不是秒数。
     */
    stayOption?: number | undefined

    /**
     * A sector option offered for a Nebula expedition.
     *
     * 星云远征表单提供的区域选项。
     */
    sector?: number | undefined
  },
): Promise<Observed<PlanetData<PageReply<FleetStep3Page>>>> {
  const body: Record<string, string | number> = {
    token: options.token,
    mission: options.mission,
    metal: options.cargo?.metal ?? 0,
    crystal: options.cargo?.crystal ?? 0,
    deuterium: options.cargo?.deuterium ?? 0,
  }
  if (options.stayOption !== undefined) body.staytime = options.stayOption
  if (options.sector !== undefined) body.sectors = options.sector
  return routePage(
    session,
    GAME_ROUTES.fleetStep3,
    { planetId: options.origin.planetId, method: 'POST', body },
    readFleetStep3,
  )
}
