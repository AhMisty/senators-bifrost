import type { Ack, PageReply } from '../../protocol/ack.ts'
import { headerBalance } from '../../protocol/context.ts'
import { elementId, requiredText } from '../../protocol/dom.ts'
import { displayed, readAmount } from '../../protocol/numbers.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { PlanetObservation, PlanetReference } from '../../types.ts'
import { ErrorCode } from '../../types.ts'

/**
 * Awarded quantity and reward multiplier from one container log row.
 *
 * 单条容器日志中的奖励数量和奖励倍率。
 */
export type ContainerReward = {
  elementId: number
  name: string

  factor: number
  awarded: number
}

export type ContainersPage = PlanetObservation & {
  kind: 'containers'
  unopenedCount: number
  openedLastDay: number
  logs: ContainerReward[]
}

export function readContainers(page: Page): ContainersPage {
  const count = page
    .$('.designation > span')
    .text()
    .match(/\(([\d.,]+)\)/)
  if (!count) throw new OperationError(ErrorCode.ParseError, 'Missing container inventory')
  return {
    kind: 'containers',
    ...planetObservation(page),

    unopenedCount: headerBalance(page, 924) ?? displayed(count[1]!),
    openedLastDay: displayed(
      requiredText(page.$('.gray_stripe .position font'), 'containers opened last day'),
    ),
    logs: page
      .$('.conteiner_rows')

      .filter((_index, node) => page.$(node).find('form').length === 0)
      .toArray()
      .map((node) => {
        const row = page.$(node)
        const text = row.find('.count_blocks').text().trim()
        const amount = text.match(/^\+\s*([\d.,]+)/)
        const multiplier = text.match(/\(x([\d.,]+)\)/)
        if (!amount)
          throw new OperationError(ErrorCode.ParseError, 'Missing container reward amount')
        return {
          elementId: elementId(row.find('img').attr('src')),
          name: row.find('.conteiner_name_utits').text().trim(),
          factor: multiplier ? readAmount(multiplier[1]) : 1,
          awarded: displayed(amount[1]!),
        }
      }),
  }
}

export function containers(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<ContainersPage>>>> {
  return routePage(session, GAME_ROUTES.containers, { planetId: options.planetId }, readContainers)
}

/**
 * Consume the requested containers and return the server receipt.
 *
 * 消耗指定数量的容器并返回服务端回执。
 */
export function containersOpen(
  session: Session,
  options: PlanetReference & { amount: number },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.containersOpen, {
    planetId: options.planetId,
    method: 'POST',
    body: { conts: options.amount },
  })
}
