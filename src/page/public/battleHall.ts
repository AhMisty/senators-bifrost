import type { PageReply } from '../../protocol/ack.ts'
import { combatants } from '../../protocol/battle-hall.ts'
import type { BattleListing } from '../../protocol/battle-hall.ts'
import { requiredText, selectOptions, tableRows, textContent } from '../../protocol/dom.ts'
import { displayed, readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import type { PublicPageOptions } from '../../protocol/public-options.ts'
import { publicPageQuery } from '../../protocol/public-options.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { PUBLIC_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { FormOption, Observation } from '../../types.ts'

export type PublicBattleHallEntry = BattleListing

export type PublicBattleHallPage = Observation & {
  kind: 'publicBattleHall'

  /**
   * Available universes; empty when only one exists.
   *
   * 可选宇宙；只有一个宇宙时为空。
   */
  universes: FormOption[]
  battles: PublicBattleHallEntry[]
}

export function readPublicBattleHall(page: Page): PublicBattleHallPage {
  page.one('.card-footer span[style*="#00FF00"]')
  return {
    kind: 'publicBattleHall',
    ...observation(page),
    universes: selectOptions(page, '#universe'),
    battles: tableRows(page, 'table tbody tr').map((row) => {
      const cells = row.children('td')
      const sides = combatants(cells.eq(1))
      return {
        rank: readInteger(textContent(cells.eq(0)), 1),
        attacker: sides.attacker,
        defender: sides.defender,
        winner: sides.winner,
        occurredAtText: requiredText(cells.eq(2), 'battle date'),
        units: displayed(requiredText(cells.eq(3), 'battle units')),
      }
    }),
  }
}

export function publicBattleHall(
  session: Session,
  options: PublicPageOptions = {},
): Promise<Observed<PageReply<PublicBattleHallPage>>> {
  return routePage(
    session,
    PUBLIC_ROUTES.battleHall,
    { query: publicPageQuery(options) },
    readPublicBattleHall,
  )
}
