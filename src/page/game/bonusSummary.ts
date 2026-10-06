import type { PageReply } from '../../protocol/ack.ts'
import { selections } from '../../protocol/dom.ts'
import { displayed } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type { Observation } from '../../types.ts'

/**
 * Percentage and factor are rounded independently by the server; neither reconstructs the exact bonus.
 *
 * 百分比与倍率均由服务端独立舍入，不能据此还原精确加成。
 */
export type BonusSummaryEntry = {
  key: string
  name: string

  percent: number

  factor: number
}

export type BonusSummaryPage = Observation & {
  kind: 'bonusSummary'

  entries: BonusSummaryEntry[]
}

export function readBonusSummary(page: Page): BonusSummaryPage {
  page.one('#content table.tabstatistica')
  return {
    kind: 'bonusSummary',
    ...observation(page),
    entries: selections(page.$('tr.classificabarra')).map((row) => {
      const cells = row.children('td')

      const key = cells
        .find('.info_bonus_img img')
        .attr('src')
        ?.match(/bonus\/([^/]+)\.gif/)?.[1]
      if (!key || cells.length !== 4)
        throw new OperationError(ErrorCode.ParseError, 'Invalid bonus summary row')
      return {
        key,
        name: cells.eq(3).text().trim(),
        percent: displayed(cells.eq(1).text().trim().replace(/%$/, '')),
        factor: displayed(cells.eq(2).text()),
      }
    }),
  }
}

export function bonusSummary(session: Session): Promise<Observed<PageReply<BonusSummaryPage>>> {
  return routePage(session, GAME_ROUTES.bonusSummary, {}, readBonusSummary)
}
