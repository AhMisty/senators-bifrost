import type { Ack, PageReply } from '../../protocol/ack.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { resourceCandidates } from '../../protocol/plan.ts'
import type { ResourcePlanCandidate } from '../../protocol/plan.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { PlanetObservation, PlanetReference } from '../../types.ts'

export type ReduceResourcesPage = PlanetObservation & {
  kind: 'reduceResources'
  candidates: ResourcePlanCandidate[]
}

export function readReduceResources(page: Page): ReduceResourcesPage {
  return {
    kind: 'reduceResources',
    ...planetObservation(page),
    candidates: resourceCandidates(page, page.form('reduceResources')),
  }
}

export function reduceResources(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<ReduceResourcesPage>>>> {
  return routePage(
    session,
    GAME_ROUTES.reduceResources,
    { planetId: options.planetId },
    readReduceResources,
  )
}

/**
 * Gather resources from targets to origin using stationed freighters. New-Star does not enforce source ownership.
 *
 * 使用驻留运输舰将 targets 的资源集中至 origin；New-Star 不校验来源星球的所有权。
 */
export function reduceResourcesGather(
  session: Session,
  options: { origin: PlanetReference; targets: readonly PlanetReference[] },
): Promise<Observed<PlanetData<Ack>>> {
  const body = new URLSearchParams()
  for (const target of options.targets) body.append('palanets[]', String(target.planetId))
  return routeAck(session, GAME_ROUTES.reduceResourcesReduce, {
    planetId: options.origin.planetId,
    method: 'POST',
    body,
  })
}
