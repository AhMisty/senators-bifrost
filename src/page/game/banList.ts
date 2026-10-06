import type { PageReply } from '../../protocol/ack.ts'
import { selections, tableRows, textContent } from '../../protocol/dom.ts'
import { readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'

export type BannedPlayer = {
  startsAtText: string

  expiresAtText: string
  playerName: string

  administrator: string
  reason: string

  contact: string | null
}

export type BanListPage = Observation & {
  kind: 'banList'

  page: number

  pageCount: number
  bans: BannedPlayer[]
}

function lastPage(page: Page): number {
  return selections(page.$('.message_page_navigation a'))
    .map((link) => textContent(link))
    .filter((label) => /^\d+$/.test(label))
    .map((label) => readInteger(label, 1))
    .reduce((last, label) => Math.max(last, label), 1)
}

export function readBanList(page: Page): BanListPage {
  page.one('#content table.tabstatistica')
  return {
    kind: 'banList',
    ...observation(page),
    page: readInteger(textContent(page.$('.active_page').first()) || '1', 1),
    pageCount: lastPage(page),
    bans: tableRows(page, 'tr.classificabarra').map((row) => {
      const cells = row.children('td')
      return {
        startsAtText: textContent(cells.eq(0)),
        expiresAtText: textContent(cells.eq(1)),
        playerName: textContent(cells.eq(2)),
        administrator: textContent(cells.eq(3)),
        reason: textContent(cells.eq(4)),
        contact: cells.eq(3).find('a').attr('href') ?? null,
      }
    }),
  }
}

export function banList(
  session: Session,
  options: { page?: number } = {},
): Promise<Observed<PageReply<BanListPage>>> {
  return routePage(
    session,
    GAME_ROUTES.banList,
    { query: options.page === undefined ? {} : { side: options.page } },
    readBanList,
  )
}
