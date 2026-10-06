import type { PageReply } from '../../protocol/ack.ts'
import { contentText, selections, tableRows, textContent } from '../../protocol/dom.ts'
import { displayed } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'

export type PlayerCardScore = {
  name: string
  points: number

  rankText: string
}

export type PlayerCardPage = Observation & {
  kind: 'playerCard'

  playerId: number

  identityText: string

  homePlanetText: string
  timezone: string

  statistics: PlayerCardScore[]

  combat: string[]
}

export function readPlayerCard(page: Page, playerId: number): PlayerCardPage {
  const card = page.one('.player_card')
  const titles = card.find('.card-title')
  const stats = tableRows(page, '.playercard_tables tr')
  return {
    kind: 'playerCard',
    ...observation(page),
    playerId,
    identityText: textContent(titles.eq(0)),
    homePlanetText: textContent(titles.eq(1)),
    timezone: textContent(titles.eq(2)),
    statistics: stats.map((row) => {
      const cells = row.children('td')
      return {
        name: textContent(cells.eq(0)),
        points: displayed(textContent(cells.eq(1))),
        rankText: textContent(cells.eq(2)).replace(/^#/, ''),
      }
    }),
    combat: selections(card.find('.alleanza_zone,p.card-text,.alleanza12,.alleanza13')).map(
      (item) => {
        const tooltip = item.attr('data-tooltip-content')
        return tooltip === undefined ? contentText(item) : textContent(tooltip)
      },
    ),
  }
}

export function playerCard(
  session: Session,
  options: { playerId: number },
): Promise<Observed<PageReply<PlayerCardPage>>> {
  return routePage(session, GAME_ROUTES.playerCard, { query: { id: options.playerId } }, (page) =>
    readPlayerCard(page, options.playerId),
  )
}
