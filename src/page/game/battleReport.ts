import type { PageReply } from '../../protocol/ack.ts'
import { coordinateIn } from '../../protocol/coordinates.ts'
import type { Selection } from '../../protocol/dom.ts'
import {
  elementId,
  requiredAttribute,
  requiredText,
  tableRows,
  textContent,
} from '../../protocol/dom.ts'
import { displayed, readInteger } from '../../protocol/numbers.ts'
import { observation, tooltipPage } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type { Coordinate, Observation } from '../../types.ts'

export type BattleUnit = {
  elementId: number

  amount: number

  destroyedAmount: number

  attributes: {
    name: string
    amount: number
  }[]
}

export type BattleParticipant = {
  name: string

  coordinate: Coordinate | null

  bonuses: string[]
  ships: BattleUnit[]
}

export type BattleRound = {
  round: number
  attackers: BattleParticipant[]
  defenders: BattleParticipant[]
}

/**
 * Rendered participants, rounds and outcome; text retains the server language and display precision.
 *
 * 页面中的参战方、回合和战果；文本保留服务端语言和显示精度。
 */
export type BattleContent = Observation & {
  reportId: string

  occurredAtText: string | null
  rounds: BattleRound[]

  outcomeText: string

  lossesText: string

  aftermathText: string
}

export type BattleReportPage = BattleContent & { kind: 'battleReport' }

export type PublicBattleReportPage = BattleContent & {
  kind: 'publicBattleReport'

  attackerText: string

  defenderText: string
}

function battleParticipants(page: Page, round: Selection, side: string): BattleParticipant[] {
  return round
    .find(`.${side} .batle_mem`)
    .toArray()
    .map((node) => {
      const member = page.$(node)
      const header = member.find('.batle_mem_header')
      return {
        name: textContent(header.children('span').first()),
        coordinate: coordinateIn(textContent(header)),
        bonuses: header
          .children('span')
          .slice(1)
          .toArray()
          .map((bonus) => textContent(page.$(bonus))),
        ships: member
          .find('.batle_unit')
          .toArray()
          .map((unitNode) => battleShip(page, page.$(unitNode))),
      }
    })
}

function battleShip(page: Page, unit: Selection): BattleUnit {
  const tooltip = tooltipPage(page, unit.find('.img_unit'))
  return {
    elementId: elementId(unit.find('img').attr('src')),

    amount: displayed(requiredAttribute(unit.find('[data-real]'), 'data-real')),

    destroyedAmount: displayed(
      requiredText(unit.find('.destruct_unit'), 'destroyed unit count').replace(/^-/, ''),
    ),
    attributes: tableRows(tooltip, 'tr').map((row) => ({
      name: textContent(row.children('td').eq(0)),
      amount: displayed(textContent(row.children('td').eq(1))),
    })),
  }
}

function readBattle<K extends 'battleReport' | 'publicBattleReport'>(
  page: Page,
  kind: K,
): BattleContent & { kind: K } {
  const battle = page.one('#content_battle')
  return {
    kind,

    ...observation(page),

    reportId: page.parameter('raport'),
    occurredAtText: textContent(battle.find('#batle_vs')) || null,
    rounds: battle
      .find('.batle_round')
      .toArray()
      .map((node) => {
        const round = page.$(node)
        return {
          round: readInteger(round.attr('id')?.replace(/^round_/, '')),
          attackers: battleParticipants(page, round, 'batle_part_att'),
          defenders: battleParticipants(page, round, 'batle_part_def'),
        }
      }),

    outcomeText: textContent(battle.children('.batle_round_info')),

    lossesText: textContent(tooltipPage(page, battle.find('.band_itog')).$('body')),

    aftermathText: textContent(battle.find('.batle_text')),
  }
}

export function readBattleReport(page: Page): BattleReportPage {
  return readBattle(page, 'battleReport')
}

export function readPublicBattleReport(page: Page): PublicBattleReportPage {
  const battle = readBattle(page, 'publicBattleReport')
  const opening = battle.rounds[0]
  if (!opening || !opening.attackers.length || !opening.defenders.length)
    throw new OperationError(
      ErrorCode.ParseError,
      'Expected both battle parties in the opening round',
    )
  return {
    ...battle,
    attackerText: opening.attackers.map((participant) => participant.name).join(' & '),
    defenderText: opening.defenders.map((participant) => participant.name).join(' & '),
  }
}

export function battleReport(
  session: Session,
  options: { reportId: string },
): Promise<Observed<PageReply<BattleReportPage>>> {
  return routePage(
    session,
    GAME_ROUTES.battleReport,
    { query: { raport: options.reportId } },
    readBattleReport,
  )
}

/**
 * Read a report through the public battle-hall route.
 *
 * 通过公开战斗名人堂入口读取战报。
 */
export function publicBattleReport(
  session: Session,
  options: { reportId: string },
): Promise<Observed<PageReply<PublicBattleReportPage>>> {
  return routePage(
    session,
    GAME_ROUTES.publicBattleReport,
    { query: { raport: options.reportId } },
    readPublicBattleReport,
  )
}
