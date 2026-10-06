import type { Ack, PageReply } from '../../protocol/ack.ts'
import { headerBalance } from '../../protocol/context.ts'
import { readAmount, readDecimal, readInteger } from '../../protocol/numbers.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import { object } from '../../protocol/script-data.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type { ElementMap, PlanetObservation, PlanetReference } from '../../types.ts'

export type DealerItem = {
  elementId: number
  name: string

  owned: number

  /**
   * Base resource value per unit before the dealer's chargePercent is deducted.
   *
   * 每个单位扣除商人 chargePercent 手续费前的资源价值。
   */
  unitPrice: ElementMap
}

const PAYOUT_IDS = [901, 902, 903, 921] as const

/**
 * Sale inventory permitted by server configuration, including ships or defenses, and the dealer's fee.
 *
 * 服务端配置允许出售的舰船或防御设施库存，以及商人手续费。
 */
export type FleetDealerPage = PlanetObservation & {
  kind: 'fleetDealer'

  chargePercent: number

  balances: Map<number, number | null>
  items: DealerItem[]
}

export function readFleetDealer(page: Page): FleetDealerPage {
  return {
    kind: 'fleetDealer',
    ...planetObservation(page),
    chargePercent: readDecimal(page.scripts.binding('Charge')),
    balances: new Map(PAYOUT_IDS.map((id) => [id, headerBalance(page, id)])),
    items: Object.entries(object(page.scripts.binding('CostInfo'))).map(([id, value]) => {
      if (!Array.isArray(value) || value.length < 3 || typeof value[1] !== 'string')
        throw new OperationError(ErrorCode.ParseError, 'Invalid fleet dealer item')
      return {
        elementId: readInteger(id, 1),
        owned: readAmount(value[0]),
        name: value[1],
        unitPrice: new Map(
          Object.entries(object(value[2])).map(([resource, cost]) => [
            readInteger(resource, 1),
            readDecimal(cost),
          ]),
        ),
      }
    }),
  }
}

export function fleetDealer(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<FleetDealerPage>>>> {
  return routePage(
    session,
    GAME_ROUTES.fleetDealer,
    { planetId: options.planetId },
    readFleetDealer,
  )
}

export function fleetDealerSend(
  session: Session,
  options: PlanetReference & { elementId: number; amount: number },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.fleetDealerSend, {
    planetId: options.planetId,
    method: 'POST',
    body: { shipID: options.elementId, count: options.amount },
  })
}
