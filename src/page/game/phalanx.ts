import type { PageReply } from '../../protocol/ack.ts'
import { addressParams, coordinateIn } from '../../protocol/coordinates.ts'
import { textContent } from '../../protocol/dom.ts'
import { fleetEvents } from '../../protocol/fleet-events.ts'
import type { FleetEvent } from '../../protocol/fleet-events.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import type { PageOptions } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Coordinate, Observation, PlanetReference } from '../../types.ts'

export type PhalanxPage = Observation & {
  kind: 'phalanx'

  target: Coordinate | null

  heading: string

  events: FleetEvent[]
}

export function readPhalanx(page: Page): PhalanxPage {
  page.one('.fleet_log')
  const heading = textContent(page.$('.gray_stripe'))
  return {
    kind: 'phalanx',
    ...observation(page),
    target: coordinateIn(heading),
    heading,
    events: fleetEvents(page),
  }
}

function scanOptions(options: {
  origin: PlanetReference
  target: Coordinate
}): PageOptions & PlanetReference {
  return { planetId: options.origin.planetId, query: addressParams(options.target) }
}

/**
 * Scan the target from the selected origin; New-Star charges fuel even for a read.
 *
 * 从指定起点扫描目标；此读取操作也会由 New-Star 扣除燃料。
 */
export function phalanx(
  session: Session,
  options: { origin: PlanetReference; target: Coordinate },
): Promise<Observed<PageReply<PhalanxPage>>> {
  return routePage(session, GAME_ROUTES.phalanx, scanOptions(options), readPhalanx, false)
}
