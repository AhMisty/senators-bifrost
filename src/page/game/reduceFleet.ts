import type { Ack, PageReply } from '../../protocol/ack.ts'
import type { Selection } from '../../protocol/dom.ts'
import { ELEMENT_ICON_SELECTOR, elementId, shipTableRows } from '../../protocol/dom.ts'
import { displayed } from '../../protocol/numbers.ts'
import { planetObservation, tooltipPage } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { planCandidates } from '../../protocol/plan.ts'
import type { PlanCandidate } from '../../protocol/plan.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { FleetSpeed } from '../../protocol/values.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type { ElementMap, PlanetObservation, PlanetReference } from '../../types.ts'

export type ReduceFleetCandidate = PlanCandidate & {
  ships: ElementMap | null
}

export type ReduceFleetPage = PlanetObservation & {
  kind: 'reduceFleet'
  candidates: ReduceFleetCandidate[]
}

function readShips(page: Page, selection: Selection): ElementMap {
  const table = tooltipPage(page, selection).$('table.reducefleet_table')
  if (table.length !== 1)
    throw new OperationError(ErrorCode.ParseError, 'Missing logistics fleet table')
  const ships: ElementMap = new Map()
  for (const { row, count } of shipTableRows(table)) {
    const image = row.find(ELEMENT_ICON_SELECTOR)
    if (image.length !== 1 || count.length !== 1)
      throw new OperationError(ErrorCode.ParseError, 'Incomplete logistics fleet entry')
    const element = elementId(image.attr('src'))
    if (ships.has(element))
      throw new OperationError(ErrorCode.ParseError, 'Duplicate logistics fleet entry')
    ships.set(element, displayed(count.text()))
  }
  return ships
}

function readCandidates(page: Page, form: Selection): ReduceFleetCandidate[] {
  return planCandidates(page, form, (row) => {
    const fleets = row.find('.rd_planet_fleets[data-tooltip-content]')
    return { ships: fleets.length ? readShips(page, fleets) : null }
  })
}

export function readReduceFleet(page: Page): ReduceFleetPage {
  return {
    kind: 'reduceFleet',
    ...planetObservation(page),
    candidates: readCandidates(page, page.form('reduceFleet')),
  }
}

export function reduceFleet(
  session: Session,
  options: PlanetReference & { speed?: FleetSpeed },
): Promise<Observed<PlanetData<PageReply<ReduceFleetPage>>>> {
  return routePage(
    session,
    GAME_ROUTES.reduceFleet,
    {
      planetId: options.planetId,
      ...(options.speed === undefined ? {} : { query: { speed: options.speed } }),
    },
    readReduceFleet,
  )
}

/**
 * Gather fleets from targets to origin. New-Star does not enforce source ownership.
 *
 * 将 targets 的舰队集中至 origin；New-Star 不校验来源星球的所有权。
 */
export function reduceFleetGather(
  session: Session,
  options: { origin: PlanetReference; speed: FleetSpeed; targets: readonly PlanetReference[] },
): Promise<Observed<PlanetData<Ack>>> {
  const body = new URLSearchParams({ speed: String(options.speed) })
  for (const target of options.targets) body.append('palanets[]', String(target.planetId))
  return routeAck(session, GAME_ROUTES.reduceFleetReduce, {
    planetId: options.origin.planetId,
    method: 'POST',
    body,
  })
}
