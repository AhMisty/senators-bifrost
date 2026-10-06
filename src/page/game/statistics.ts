import type { PageReply } from '../../protocol/ack.ts'
import type { Selection } from '../../protocol/dom.ts'
import { integerOptions, requiredLinkId, tableRows, textContent } from '../../protocol/dom.ts'
import { displayed, readInteger, readQuantity } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { FormOption, Observation } from '../../types.ts'

export type StatisticsRow = {
  rank: number

  change: string

  id: number | null

  name: string
  points: number

  alliance: string | null

  members: number | null

  pointsPerMember: number | null
}

export type StatisticsPage = Observation & {
  kind: 'statistics'

  entityType: number

  rankingType: number

  startRank: number

  filters: {
    entityTypes: FormOption<number>[]
    rankingTypes: FormOption<number>[]
    rankRanges: FormOption<number>[]
  }
  rows: StatisticsRow[]
}

function playerRow(page: Page, row: Selection): StatisticsRow {
  const cells = row.children('td')
  const entity = cells.eq(2).find('a').first()
  return {
    rank: readInteger(textContent(cells.eq(0)), 1),
    change: textContent(cells.eq(1)),

    id: page.handlerId(entity.attr('onclick'), 'Playercard'),

    name: textContent(cells.eq(2).find('span').not('.classstat6').first()),
    points: displayed(textContent(cells.eq(5))),
    alliance: textContent(cells.eq(4)),
    members: null,
    pointsPerMember: null,
  }
}

function allianceRow(page: Page, row: Selection): StatisticsRow {
  const cells = row.children('td')
  const entity = cells.eq(2).find('a').first()
  return {
    rank: readInteger(textContent(cells.eq(0)), 1),
    change: textContent(cells.eq(1)),
    id: requiredLinkId(page, entity),
    name: textContent(entity),
    points: displayed(textContent(cells.eq(5))),
    alliance: null,
    members: readQuantity(textContent(cells.eq(3))),
    pointsPerMember: displayed(textContent(cells.eq(6))),
  }
}

export function readStatistics(page: Page): StatisticsPage {
  const entityType = readInteger(page.fieldValue('who'))
  const allianceMode = entityType === 2
  return {
    kind: 'statistics',
    ...observation(page),
    entityType,
    rankingType: readInteger(page.fieldValue('type')),
    startRank: readInteger(page.fieldValue('range')),
    filters: {
      entityTypes: integerOptions(page.$('#who'), 1),
      rankingTypes: integerOptions(page.$('#type'), 1),
      rankRanges: integerOptions(page.$('#range'), 1),
    },
    rows: tableRows(page, 'tr.classificabarra').map((row) =>
      allianceMode ? allianceRow(page, row) : playerRow(page, row),
    ),
  }
}

export function statistics(
  session: Session,
  options: {
    entityType?: 1 | 2
    rankingType?: 1 | 2 | 3 | 4 | 5
    rankRange?: number
  } = {},
): Promise<Observed<PageReply<StatisticsPage>>> {
  return routePage(
    session,
    GAME_ROUTES.statistics,
    {
      query: {
        ...(options.entityType === undefined ? {} : { who: options.entityType }),
        ...(options.rankingType === undefined ? {} : { type: options.rankingType }),
        ...(options.rankRange === undefined ? {} : { range: options.rankRange }),
      },
    },
    readStatistics,
  )
}
