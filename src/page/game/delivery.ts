import type { Ack, PageReply } from '../../protocol/ack.ts'
import { TICKER_RESOURCES } from '../../protocol/context.ts'
import { readDecimal } from '../../protocol/numbers.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { resourceCandidates } from '../../protocol/plan.ts'
import type { ResourcePlanCandidate } from '../../protocol/plan.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { PlanetObservation, PlanetReference, ResourceInput } from '../../types.ts'

export type DeliveryPage = PlanetObservation & {
  kind: 'delivery'
  candidates: ResourcePlanCandidate[]

  /**
   * Antimatter charged per destination, regardless of cargo amount.
   *
   * 每个目的地收取的反物质费用，与货物数量无关。
   */
  feePerDestination: number
}

export function readDelivery(page: Page): DeliveryPage {
  return {
    kind: 'delivery',
    ...planetObservation(page),
    candidates: resourceCandidates(page, page.form('delivery')),

    feePerDestination: readDecimal(page.scripts.binding('CostOne')),
  }
}

export function delivery(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<DeliveryPage>>>> {
  return routePage(session, GAME_ROUTES.delivery, { planetId: options.planetId }, readDelivery)
}

/**
 * Send the stated cargo to each target using the origin planet battle transporters.
 *
 * 使用起点星球的战斗运输舰，向每个目标运送指定数量的货物。
 */
export function deliverySend(
  session: Session,
  options: {
    origin: PlanetReference
    resources: ResourceInput
    targets: readonly PlanetReference[]
  },
): Promise<Observed<PlanetData<Ack>>> {
  const body = new URLSearchParams()
  for (const { id, name } of TICKER_RESOURCES)
    body.set(`r${id}`, String(options.resources[name] ?? 0))
  for (const target of options.targets) body.append('palanets[]', String(target.planetId))
  return routeAck(session, GAME_ROUTES.deliverySend, {
    planetId: options.origin.planetId,
    method: 'POST',
    body,
  })
}
