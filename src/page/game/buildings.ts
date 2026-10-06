import type { Ack, PageReply } from '../../protocol/ack.ts'
import {
  readConstructionQuotes,
  readCurrentTiming,
  readLevelQueue,
  readLevels,
} from '../../protocol/construction.ts'
import type { ConstructionPageState } from '../../protocol/construction.ts'
import { readQuantity } from '../../protocol/numbers.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { PlanetReference } from '../../types.ts'

export type BuildingsPage = {
  kind: 'buildings'

  fields: {
    used: number
    total: number
    free: number
  }
} & ConstructionPageState

export function readBuildings(page: Page): BuildingsPage {
  const levels = readLevels(page)
  const queue = readLevelQueue(page)

  const fields = page.$('.fildes_band_text > span')
  return {
    kind: 'buildings',
    ...planetObservation(page),
    levels,
    quotes: readConstructionQuotes(page, 'costResources'),
    queue,
    currentTiming: readCurrentTiming(page, queue),
    fields: {
      used: readQuantity(fields.eq(0).text()),
      total: readQuantity(fields.eq(1).text()),
      free: readQuantity(fields.eq(2).text()),
    },
  }
}

export function buildings(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<BuildingsPage>>>> {
  return routePage(session, GAME_ROUTES.buildings, { planetId: options.planetId }, readBuildings)
}

export function buildingsUpgrade(
  session: Session,
  options: PlanetReference & { elementId: number; levels: number },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.buildings, {
    planetId: options.planetId,
    method: 'POST',
    body: {
      cmd: 'insert',
      building: options.elementId,
      lvlup: options.levels,
      levelToBuildInFo: 0,
    },
  })
}

/**
 * Cancel the active entry and every later entry for the same building.
 *
 * 取消正在建造的条目及该建筑后续所有排队条目。
 */
export function buildingsCancel(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.buildings, {
    planetId: options.planetId,
    method: 'POST',
    body: { cmd: 'cancel' },
  })
}

/**
 * Remove a zero-based queue position.
 *
 * 移除从零开始的队列位置。
 */
export function buildingsRemove(
  session: Session,
  options: PlanetReference & { queueIndex: number },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.buildings, {
    planetId: options.planetId,
    method: 'POST',
    body: { cmd: 'remove', listid: options.queueIndex + 1 },
  })
}

export function buildingsDowngrade(
  session: Session,
  options: PlanetReference & { elementId: number },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.buildings, {
    planetId: options.planetId,
    method: 'POST',
    body: { cmd: 'destroy', building: options.elementId },
  })
}

/**
 * Complete the active construction by spending dark matter.
 *
 * 消耗暗物质立即完成当前建造。
 */
export function buildingsFinish(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.buildings, {
    planetId: options.planetId,
    method: 'POST',
    body: { cmd: 'fast' },
  })
}
