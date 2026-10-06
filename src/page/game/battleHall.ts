import type { PageReply } from '../../protocol/ack.ts'
import { combatants } from '../../protocol/battle-hall.ts'
import type { BattleListing } from '../../protocol/battle-hall.ts'
import { linkUrl, tableRows, textContent } from '../../protocol/dom.ts'
import { displayed, readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type { Observation } from '../../types.ts'

export type BattleHallEntry = BattleListing & {
  reportId: string
}

export type BattleHallPage = Observation & {
  kind: 'battleHall'
  entries: BattleHallEntry[]
}

export function readBattleHall(page: Page): BattleHallPage {
  page.one('table.tabstatistica a[href*="page=battleHall"][href*="order=date"]')
  return {
    kind: 'battleHall',
    ...observation(page),
    entries: tableRows(page, 'tr.classificabarra').map((row) => {
      const cells = row.children('td')
      const report = cells.eq(1).find('a')
      const reportId = linkUrl(page, report).searchParams.get('raport')
      if (reportId === null)
        throw new OperationError(ErrorCode.ParseError, 'Battle hall entry has no report ID')
      const sides = combatants(report)
      return {
        rank: readInteger(textContent(cells.eq(0)), 1),
        reportId,
        attacker: sides.attacker,
        defender: sides.defender,
        winner: sides.winner,
        occurredAtText: textContent(cells.eq(2)),
        units: displayed(textContent(cells.eq(3))),
      }
    }),
  }
}

export function battleHall(
  session: Session,
  options: { order?: 'date' | 'units'; direction?: 'asc' | 'desc' } = {},
): Promise<Observed<PageReply<BattleHallPage>>> {
  return routePage(
    session,
    GAME_ROUTES.battleHall,
    {
      query: {
        ...(options.order === undefined ? {} : { order: options.order }),
        ...(options.direction === undefined ? {} : { sort: options.direction }),
      },
    },
    readBattleHall,
  )
}
