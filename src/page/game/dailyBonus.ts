import type { PageReply } from '../../protocol/ack.ts'
import { elementId } from '../../protocol/dom.ts'
import { displayed } from '../../protocol/numbers.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { PlanetReference, ElementMap, PlanetObservation } from '../../types.ts'
import { ErrorCode } from '../../types.ts'

export type DailyBonusPage = PlanetObservation & {
  kind: 'dailyBonus'

  rewards: ElementMap
}

export function readDailyBonus(page: Page): DailyBonusPage {
  const rewards: ElementMap = new Map()
  page.$('#content .fade').each((_index, node) => {
    const row = page.$(node)
    rewards.set(elementId(row.find('img').attr('src')), displayed(row.find('.card-title').text()))
  })
  if (!rewards.size) throw new OperationError(ErrorCode.ParseError, 'Missing daily bonus receipt')
  return {
    kind: 'dailyBonus',
    ...planetObservation(page),
    rewards,
  }
}

/**
 * Claim the daily reward; this request changes account resources.
 *
 * 领取每日奖励；该请求会改变账号资源。
 */
export function claimDailyBonus(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<DailyBonusPage>>>> {
  return routePage(
    session,
    GAME_ROUTES.claimDailyBonus,
    { planetId: options.planetId },
    readDailyBonus,
  )
}
