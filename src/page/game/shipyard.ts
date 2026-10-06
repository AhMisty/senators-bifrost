import type { Ack, PageReply } from '../../protocol/ack.ts'
import { prefixedId, requiredAttribute, selections } from '../../protocol/dom.ts'
import { elementBody } from '../../protocol/elements.ts'
import { numericMap } from '../../protocol/fleet-events.ts'
import {
  countdownRemaining,
  displayed,
  readAmount,
  readInteger,
  readQuantity,
  timing,
} from '../../protocol/numbers.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import { object } from '../../protocol/script-data.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type {
  ElementInput,
  ElementMap,
  PlanetObservation,
  Timing,
  PlanetReference,
} from '../../types.ts'

/**
 * Defense includes missiles; fleet and defense share one construction queue.
 *
 * 防御目录包含导弹；舰队和防御共用一个建造队列。
 */
export type ShipyardCatalogue = 'fleet' | 'defense'

export type ShipyardQueueItem = {
  elementId: number

  remaining: number

  secondsPerUnit: number
}

/**
 * Per-unit costs and duration plus the server-reported maximum quantity at observation time.
 *
 * 观察时刻的单位成本、建造时长及服务端报告的最大可造数量。
 */
export type ShipyardQuote = {
  elementId: number
  costs: ElementMap
  durationSeconds: number
  maximumBuildable: number
}

export type ShipyardPage = PlanetObservation & {
  kind: 'shipyard'

  catalogue: ShipyardCatalogue

  /**
   * Server-rounded catalogue stock; omitted entries do not imply zero, and fractional stock is not exposed.
   *
   * 服务端舍入后的目录库存；未列出的元素不代表库存为零，页面不提供小数库存。
   */
  inventory: ElementMap
  quotes: Map<number, ShipyardQuote>

  queue: ShipyardQueueItem[]

  /**
   * Progress of the head unit, not of the entire batch.
   *
   * 队首单个单位的建造进度，不是整批进度。
   */
  unitTiming: Timing | null
}

function readQuotes(page: Page): Map<number, ShipyardQuote> {
  return new Map(
    Object.entries(object(page.scripts.binding('DatatList'))).map(([id, raw]) => {
      const entry = object(raw)
      const elementId = readInteger(id, 1)
      return [
        elementId,
        {
          elementId,
          costs: numericMap(entry.costResources),
          durationSeconds: readAmount(entry.elementTime),
          maximumBuildable: readQuantity(entry.maxBuildable),
        },
      ]
    }),
  )
}

function readCatalogue(page: Page): ShipyardCatalogue {
  return page.mode() === 'defense' ? 'defense' : 'fleet'
}

function readInventory(page: Page): ElementMap {
  const elements = page.one('#build_elements')
  const available: ElementMap = new Map()
  for (const box of selections(elements.find('.build_box[id^="s_"]'))) {
    const id = prefixedId(requiredAttribute(box, 'id'), 's_', 1)
    const cell = box.find(`[id="val_${id}"]`)
    if (cell.length !== 1 || available.has(id))
      throw new OperationError(ErrorCode.ParseError, 'Invalid shipyard inventory')

    const text = cell.text().trim()
    if (text && !(text.startsWith('(') && text.endsWith(')')))
      throw new OperationError(ErrorCode.ParseError, 'Invalid inventory quantity')
    available.set(id, text ? displayed(text.slice(1, -1)) : 0)
  }
  return available
}

function readQueue(page: Page): { queue: ShipyardQueueItem[]; elapsed: number | null } {
  const raw = page.scripts.binding('data')
  if (Array.isArray(raw) && raw.length === 0) return { queue: [], elapsed: null }
  const data = object(raw)
  if (!Array.isArray(data.Queue) || !data.Queue.length)
    throw new OperationError(ErrorCode.ParseError, 'Invalid shipyard queue')
  const queue: ShipyardQueueItem[] = []
  for (const entry of data.Queue) {
    if (!Array.isArray(entry) || entry.length !== 4)
      throw new OperationError(ErrorCode.ParseError, 'Invalid shipyard queue item')
    queue.push({
      elementId: readInteger(entry[3], 1),
      remaining: readQuantity(entry[1], 1),
      secondsPerUnit: readAmount(entry[2]),
    })
  }

  return { queue, elapsed: readAmount(data.b_hangar_id_plus) }
}

export function readShipyard(page: Page): ShipyardPage {
  const { queue, elapsed } = readQueue(page)
  const head = queue[0]
  return {
    kind: 'shipyard',
    ...planetObservation(page),
    catalogue: readCatalogue(page),
    inventory: readInventory(page),
    quotes: readQuotes(page),
    queue,

    unitTiming:
      head === undefined || elapsed === null
        ? null
        : timing(head.secondsPerUnit, countdownRemaining(head.secondsPerUnit, elapsed)),
  }
}

export function shipyard(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<ShipyardPage>>>> {
  return routePage(session, GAME_ROUTES.shipyard, { planetId: options.planetId }, readShipyard)
}

export function shipyardDefense(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<ShipyardPage>>>> {
  return routePage(
    session,
    GAME_ROUTES.shipyardDefense,
    { planetId: options.planetId },
    readShipyard,
  )
}

export function shipyardProduce(
  session: Session,
  options: PlanetReference & { elements: ElementInput },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.shipyard, {
    planetId: options.planetId,
    method: 'POST',
    body: elementBody(options.elements, 'fmenge[', ']'),
  })
}

/**
 * Cancel zero-based queue positions and apply the server refund rules.
 *
 * 取消从零开始的队列位置，并按服务端规则退款。
 */
export function shipyardCancel(
  session: Session,
  options: PlanetReference & { queueIndexes: readonly number[] },
): Promise<Observed<PlanetData<Ack>>> {
  const body = new URLSearchParams({ action: 'delete' })
  for (const index of options.queueIndexes) body.append('auftr[]', String(index))
  return routeAck(session, GAME_ROUTES.shipyard, {
    planetId: options.planetId,
    method: 'POST',
    body,
  })
}
