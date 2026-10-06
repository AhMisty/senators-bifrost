import type { Ack, PageReply } from '../../protocol/ack.ts'
import {
  readConstructionQuotes,
  readCurrentTiming,
  readLevelQueue,
  readLevels,
} from '../../protocol/construction.ts'
import type { ConstructionPageState } from '../../protocol/construction.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { PlanetReference } from '../../types.ts'

/**
 * Account research levels and queue, with quotes calculated for the selected planet.
 *
 * 账号的研究等级和队列，报价按所选星球计算。
 */
export type ResearchPage = { kind: 'research' } & ConstructionPageState

export function readResearch(page: Page): ResearchPage {
  const levels = readLevels(page)
  const queue = readLevelQueue(page)
  return {
    kind: 'research',
    ...planetObservation(page),
    levels,
    quotes: readConstructionQuotes(page, 'costRessources'),
    queue,
    currentTiming: readCurrentTiming(page, queue),
  }
}

export function research(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<ResearchPage>>>> {
  return routePage(session, GAME_ROUTES.research, { planetId: options.planetId }, readResearch)
}

export function researchUpgrade(
  session: Session,
  options: PlanetReference & { elementId: number; levels: number },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.research, {
    planetId: options.planetId,
    method: 'POST',
    body: { cmd: 'insert', tech: options.elementId, lvlup: options.levels, levelToBuildInFo: 0 },
  })
}

/**
 * Cancel active research; New-Star may miscalculate later queue times across planets.
 *
 * 取消当前研究；New-Star 可能错误重算跨星球的后续队列时间。
 */
export function researchCancel(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.research, {
    planetId: options.planetId,
    method: 'POST',
    body: { cmd: 'cancel' },
  })
}

/**
 * Remove a zero-based queue position; later queue timing is determined by the server.
 *
 * 移除从零开始的队列位置；后续队列时间由服务端计算。
 */
export function researchRemove(
  session: Session,
  options: PlanetReference & { queueIndex: number },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.research, {
    planetId: options.planetId,
    method: 'POST',
    body: { cmd: 'remove', listid: options.queueIndex + 1 },
  })
}

/**
 * Spend dark matter to finish current research; New-Star may leave later queue levels and times inconsistent.
 *
 * 消耗暗物质完成当前研究；New-Star 可能留下后续等级和时间不一致的队列。
 */
export function researchFinish(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.research, {
    planetId: options.planetId,
    method: 'POST',
    body: { cmd: 'fast' },
  })
}
