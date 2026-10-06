import type { PageReply } from '../../protocol/ack.ts'
import { requiredAttribute, tableRows } from '../../protocol/dom.ts'
import { displayed, readInteger } from '../../protocol/numbers.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Coordinate, PlanetObservation, PlanetReference } from '../../types.ts'
import { ErrorCode } from '../../types.ts'

export type DebrisField = {
  planetId: number
  coordinate: Coordinate
  metal: number
  crystal: number
}

export type FindDebrisPage = PlanetObservation & {
  kind: 'findDebris'

  fields: DebrisField[]
}

export function readFindDebris(page: Page): FindDebrisPage {
  page.one('table.ally_ranks')
  return {
    kind: 'findDebris',
    ...planetObservation(page),
    fields: tableRows(page, 'table.ally_ranks tr').map((row) => {
      const cells = row.children('td')
      if (cells.length !== 6)
        throw new OperationError(ErrorCode.ParseError, 'Incomplete debris record')
      return {
        planetId: readInteger(
          page.staticCall(requiredAttribute(cells.eq(5).find('a'), 'href'), 'doit')[1],
          1,
        ),
        coordinate: {
          galaxy: readInteger(cells.eq(0).text(), 1),
          system: readInteger(cells.eq(1).text(), 1),
          planet: readInteger(cells.eq(2).text(), 1),
        },
        metal: displayed(cells.eq(3).text()),
        crystal: displayed(cells.eq(4).text()),
      }
    }),
  }
}

/**
 * Search the selected planet galaxy within the range determined by its shipyard level.
 *
 * 在所选星球所在星系中搜索，范围由该星球的造船厂等级决定。
 */
export function findDebris(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<FindDebrisPage>>>> {
  return routePage(
    session,
    GAME_ROUTES.findDebris,
    { planetId: options.planetId, query: { y: 1 } },
    readFindDebris,
  )
}
