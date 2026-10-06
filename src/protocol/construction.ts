import { ErrorCode } from '../types.ts'
import type { ElementMap, PlanetObservation, Timing } from '../types.ts'
import { imageId, selections, textContent } from './dom.ts'
import { readAmount, readDecimal, readInteger, readQuantity, timing } from './numbers.ts'
import type { Page } from './page.ts'
import { OperationError } from './result.ts'
import { object } from './script-data.ts'
import type { StaticObject, StaticValue } from './script-data.ts'

/**
 * Queue item in construction order; level is the dismantled level for removal entries.
 *
 * 按建造顺序排列的队列条目；拆除时 level 为被拆除等级。
 */
export type ConstructionQueueItem = {
  elementId: number

  level: number

  /**
   * Only the head entry reports a localized completion time; others are null.
   *
   * 仅队首条目显示本地化完成时间，其余为 null。
   */
  finishTimeText: string | null
}

/**
 * Current page quote includes queued levels and does not predict other levels.
 *
 * 页面当前报价包含队列影响，不用于推算其他等级。
 */
export type ConstructionQuote = {
  elementId: number
  currentLevel: number
  maximumLevel: number
  factor: number
  costs: ElementMap
  durationSeconds: number
}

/**
 * Levels, queues and head-entry progress shared by building and research pages.
 *
 * 建筑与研究页面共用的等级、队列与队首进度。
 */
export type ConstructionPageState = PlanetObservation & {
  levels: ElementMap

  quotes: Map<number, ConstructionQuote>

  queue: ConstructionQueueItem[]

  currentTiming: Timing | null
}

type LevelEntry = {
  level: number

  raw: StaticObject
}

/**
 * Cache DatatList so levels and quotes reuse the same decode.
 *
 * 缓存 DatatList，等级与报价复用同一次解码。
 */
const LEVEL_ENTRIES = new WeakMap<Page, Map<number, LevelEntry>>()

function levelEntries(page: Page): Map<number, LevelEntry> {
  const cached = LEVEL_ENTRIES.get(page)
  if (cached !== undefined) return cached
  const entries = new Map<number, LevelEntry>()
  for (const [key, value] of Object.entries(object(page.scripts.binding('DatatList')))) {
    const elementId = readInteger(key, 1)
    const entry = object(value)
    if (entry.id !== undefined && readInteger(entry.id, 1) !== elementId)
      throw new OperationError(ErrorCode.ParseError, 'Element ID mismatch')
    entries.set(elementId, { level: readQuantity(entry.level), raw: entry })
  }
  LEVEL_ENTRIES.set(page, entries)
  return entries
}

/**
 * Read complete quotes, omitting entries without quote fields.
 *
 * 读取完整报价，缺少报价字段的条目不进入结果。
 */
export function readConstructionQuotes(
  page: Page,
  costField: 'costResources' | 'costRessources',
): Map<number, ConstructionQuote> {
  const quotes = new Map<number, ConstructionQuote>()
  for (const [elementId, entry] of levelEntries(page)) {
    const costValue: StaticValue | undefined = entry.raw[costField]
    const fields = [entry.raw.factor, entry.raw.maxLevel, entry.raw.elementTime, costValue]
    if (fields.some((field) => field === undefined)) continue
    const costs = new Map<number, number>()
    for (const [resource, amount] of Object.entries(object(costValue)))
      costs.set(readInteger(resource, 1), readAmount(amount))
    quotes.set(elementId, {
      elementId,
      currentLevel: entry.level,
      maximumLevel: readQuantity(entry.raw.maxLevel),
      factor: readDecimal(entry.raw.factor),
      costs,
      durationSeconds: readAmount(entry.raw.elementTime),
    })
  }
  return quotes
}

/**
 * Read raw DatatList levels without display rounding.
 *
 * 读取 DatatList 的原始等级，不使用显示舍入值。
 */
export function readLevels(page: Page): ElementMap {
  const levels: ElementMap = new Map()
  for (const [elementId, entry] of levelEntries(page)) levels.set(elementId, entry.level)
  if (!levels.size) throw new OperationError(ErrorCode.ParseError, 'Empty level data')
  return levels
}

export function readLevelQueue(page: Page): ConstructionQueueItem[] {
  const blocks = page.$('#build_process')
  if (!blocks.length) return []
  if (blocks.length !== 1)
    throw new OperationError(ErrorCode.ParseError, 'Ambiguous construction queue')
  const queue: ConstructionQueueItem[] = []
  for (const item of selections(blocks.children('.element_row'))) {
    const element = imageId(item.attr('style'))
    if (element === null) {
      if (item.find('.onlistremov').length)
        throw new OperationError(ErrorCode.ParseError, 'Queue item has no element ID')
      continue
    }
    const level = item.find('.onlistremov')
    if (level.length !== 1) throw new OperationError(ErrorCode.ParseError, 'Missing queued level')

    const finish = item.find('.data_scad')
    queue.push({
      elementId: element,
      level: readQuantity(level.text()),
      finishTimeText: finish.length === 1 ? textContent(finish) : null,
    })
  }
  if (!queue.length) throw new OperationError(ErrorCode.ParseError, 'Queue block has no items')
  return queue
}

/**
 * The two progress bars carry total and remaining duration; the page does not report a percentage.
 *
 * 两个进度条分别携带总时长与剩余时长，页面不直接给出百分比。
 */
export function readCurrentTiming(
  page: Page,
  queue: readonly ConstructionQueueItem[],
): Timing | null {
  if (!queue.length) return null
  return timing(
    readAmount(page.attribute('#build_process #time', 'data-time')),
    readAmount(page.attribute('#build_process #progressbar', 'data-time')),
  )
}
