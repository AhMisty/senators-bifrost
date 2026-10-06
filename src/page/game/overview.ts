import type { Ack, PageReply } from '../../protocol/ack.ts'
import { coordinateIn } from '../../protocol/coordinates.ts'
import { contentText, elementId, responseUrl, textContent } from '../../protocol/dom.ts'
import type { FleetEvent, FleetSlots } from '../../protocol/fleet-events.ts'
import { fleetEvents, slots } from '../../protocol/fleet-events.ts'
import {
  displayed,
  leadingQuantity,
  readAmount,
  readDecimal,
  readQuantity,
} from '../../protocol/numbers.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Coordinate, PlanetObservation, PlanetReference } from '../../types.ts'
import { ErrorCode } from '../../types.ts'

/**
 * Visible queue card and remaining countdown; null duration means idle.
 *
 * 页面队列卡片及剩余倒计时；时长为 null 表示空闲。
 */
export type ConstructionCard = {
  kind: 'building' | 'research' | 'shipyard'

  text: string

  remainingSeconds: number | null
}

/**
 * Claim availability from the menu; a missing control yields null.
 *
 * 菜单显示的奖励领取状态；缺少控件时为 null。
 */
export type DailyBonus = {
  hasClaimControl: boolean | null

  nextClaimTimeText: string | null
}

/**
 * Current planet details and visible events; unexposed optional details remain null.
 *
 * 当前星球资料和可见事件；页面未提供的可选详情为 null。
 */
export type OverviewPage = PlanetObservation & {
  kind: 'overview'
  name: string

  coordinate: Coordinate | null
  diameter: number | null

  fields: { used: number; total: number } | null

  temperature: { minimum: number; maximum: number } | null

  rankingText: string | null

  selections: {
    race: number | null
    ethic: number | null
    government: number | null
  }

  fleetSlots: FleetSlots | null
  expeditionSlots: FleetSlots | null

  events: FleetEvent[]
  onlinePlayers: number | null

  news: string | null

  construction: ConstructionCard[]

  dailyBonus: DailyBonus
}

function readOverviewBonus(page: Page): DailyBonus {
  const button = page.$('#left_menu a.big_btn.blue.btn_menu_big')
  if (button.length !== 1) return { hasClaimControl: null, nextClaimTimeText: null }
  const href = button.attr('href')
  return {
    hasClaimControl: href
      ? responseUrl(href, page.url).searchParams.get('page') === 'bonus'
      : false,
    nextClaimTimeText: href ? null : textContent(button),
  }
}

export function readOverview(page: Page): OverviewPage {
  if (!page.$('#big_panet').length)
    throw new OperationError(ErrorCode.ParseError, 'Overview details unavailable')
  const details = page.$('.palnet_big_info .right_part')
  const fields = details.eq(0).find('span')
  const temperature = [
    ...details
      .eq(1)
      .text()
      .matchAll(/-?\d+(?:\.\d+)?/g),
  ].map((match) => readDecimal(match[0]))
  const selection = (name: string): number | null => {
    const icon = page.$(`a[href*="page=${name}"] .overvire`)
    return icon.length ? elementId(icon.attr('style')) : null
  }
  return {
    kind: 'overview',
    ...planetObservation(page),
    name: textContent(page.$('#big_panet .planetname').last()),
    coordinate: coordinateIn(details.eq(2).text()),

    diameter: details.eq(0).length ? leadingQuantity(textContent(details.eq(0).text())) : null,
    fields:
      fields.length === 2
        ? {
            used: readQuantity(fields.eq(0).text()),
            total: readQuantity(fields.eq(1).text()),
          }
        : null,
    temperature:
      temperature.length === 2 ? { minimum: temperature[0]!, maximum: temperature[1]! } : null,
    rankingText: textContent(details.eq(3)) || null,
    selections: {
      race: selection('race'),
      ethic: selection('ethics'),
      government: selection('formgovernment'),
    },
    ...slots(page),
    events: fleetEvents(page),
    onlinePlayers: page.$('#online_user span').length
      ? displayed(page.$('#online_user span').text())
      : null,
    news: contentText(page.$('#content .col-12 > .card > .card-body > .card-text')) || null,
    construction: (
      [
        ['.costruzioni', 'building'],
        ['.ricerche', 'research'],
        ['.flotte', 'shipyard'],
      ] as const
    ).flatMap(([selector, kind]) => {
      const item = page.$(`${selector} .overvieew9`)
      if (!item.length) return []
      const remaining = item.find('.timer').attr('data-time')
      return [
        {
          kind,
          text: textContent(item),
          remainingSeconds: remaining === undefined ? null : readAmount(remaining),
        },
      ]
    }),
    dailyBonus: readOverviewBonus(page),
  }
}

export function overview(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<OverviewPage>>>> {
  return routePage(session, GAME_ROUTES.overview, { planetId: options.planetId }, readOverview)
}

export function overviewRename(
  session: Session,
  options: PlanetReference & { name: string },
): Promise<Observed<Ack>> {
  return routeAck(
    session,
    GAME_ROUTES.overviewRename,
    {
      planetId: options.planetId,
      method: 'POST',
      body: { name: options.name },
    },
    false,
  )
}

/**
 * Schedule abandonment of the selected planet for one day later.
 *
 * 将所选星球设为一天后弃置。
 */
export function overviewDelete(
  session: Session,
  options: PlanetReference & { password: string },
): Promise<Observed<Ack>> {
  return routeAck(
    session,
    GAME_ROUTES.overviewDelete,
    {
      planetId: options.planetId,
      method: 'POST',
      body: { password: options.password },
    },
    false,
  )
}
