import { ErrorCode } from '../types.ts'
import type { ElementMap, ResourceSupply, PlanetContext, ResourceAmounts } from '../types.ts'
import type { Selection } from './dom.ts'
import { requiredAttribute, selections, withoutChildren } from './dom.ts'
import { abbreviated, displayed, readDecimal } from './numbers.ts'
import { planetObservation, tooltipPage } from './page.ts'
import type { Page } from './page.ts'
import { OperationError } from './result.ts'
import { object } from './script-data.ts'
import { readChoice } from './values.ts'

const RESOURCES = {
  901: { resourceId: 901, name: 'metal', kind: 'stock' },
  902: { resourceId: 902, name: 'crystal', kind: 'stock' },
  903: { resourceId: 903, name: 'deuterium', kind: 'stock' },
  911: { resourceId: 911, name: 'energy', kind: 'supply' },
  912: { resourceId: 912, name: 'build', kind: 'supply' },
  913: { resourceId: 913, name: 'tech', kind: 'supply' },
  914: { resourceId: 914, name: 'fleet', kind: 'supply' },
  915: { resourceId: 915, name: 'defense', kind: 'supply' },
  916: { resourceId: 916, name: 'missile', kind: 'supply' },
  921: { resourceId: 921, name: 'darkmatter', kind: 'stock' },
  922: { resourceId: 922, name: 'antimatter', kind: 'stock' },
  923: { resourceId: 923, name: 'stardust', kind: 'stock' },
  924: { resourceId: 924, name: 'container', kind: 'stock' },
} as const

export type ResourceId = keyof typeof RESOURCES
type Resource = (typeof RESOURCES)[ResourceId]
export type StockResourceId = Extract<Resource, { kind: 'stock' }>['resourceId']
export type SupplyResourceId = Extract<Resource, { kind: 'supply' }>['resourceId']

export const RESOURCE_IDS: readonly ResourceId[] = Object.values(RESOURCES).map(
  (item) => item.resourceId,
)

const STOCK_IDS: readonly StockResourceId[] = Object.values(RESOURCES)
  .filter((item) => item.kind === 'stock')
  .map((item) => item.resourceId)

export function isResourceId(value: number): value is ResourceId {
  return Object.hasOwn(RESOURCES, value)
}

export function isSupplyResourceId(value: ResourceId): value is SupplyResourceId {
  return RESOURCES[value].kind === 'supply'
}

/**
 * Decode a New-Star resource ID.
 *
 * 解码 New-Star 资源 ID。
 */
export function readResourceId(value: unknown): ResourceId {
  return readChoice(value, RESOURCE_IDS, 'resource')
}

export function readStockResourceId(value: unknown): StockResourceId {
  return readChoice(value, STOCK_IDS, 'stock resource')
}

/**
 * Resource order used by planetary stocks and production tickers.
 *
 * 星球库存及生产计时器的资源顺序。
 */
export const PLANET_STOCK_IDS = [901, 902, 903] as const

export type PlanetStockId = (typeof PLANET_STOCK_IDS)[number]

export const TICKER_RESOURCES: readonly {
  id: PlanetStockId
  name: (typeof RESOURCES)[PlanetStockId]['name']
}[] = PLANET_STOCK_IDS.map((id) => ({ id, name: RESOURCES[id].name }))

const tickerIds: ReadonlySet<number> = new Set<number>(PLANET_STOCK_IDS)

export function hasTicker(resourceId: number): resourceId is PlanetStockId {
  return tickerIds.has(resourceId)
}

export function readPlanetStockId(value: unknown): PlanetStockId {
  return readChoice(value, PLANET_STOCK_IDS, 'planet stock resource')
}

const ENERGY_ID = 911

const CURRENT_NODES = new WeakMap<Page, ReadonlyMap<string, Selection>>()

function currentNodes(page: Page): ReadonlyMap<string, Selection> {
  const cached = CURRENT_NODES.get(page)
  if (cached) return cached
  const nodes = new Map<string, Selection>()
  for (const item of selections(page.$('[id^="current_"]'))) {
    nodes.set(requiredAttribute(item, 'id').slice('current_'.length), item)
  }
  CURRENT_NODES.set(page, nodes)
  return nodes
}

function currentBalance(page: Page, name: string): Selection {
  const node = currentNodes(page).get(name)
  if (node === undefined)
    throw new OperationError(ErrorCode.ParseError, `Expected one #current_${name}, found 0`)
  return node
}

/**
 * Unformatted stock, capacity and hourly production from a header ticker.
 *
 * 头部计时器的未格式化库存、容量与每小时产量。
 */
export type ResourceTicker = { available: number; capacity: number; production: number }

const TICKERS = new WeakMap<Page, ReadonlyMap<string, ResourceTicker>>()

function tickersFor(page: Page): ReadonlyMap<string, ResourceTicker> {
  const cached = TICKERS.get(page)
  if (cached) return cached
  const tickers = new Map<string, ResourceTicker>()
  for (const args of page.scripts.calls('resourceTicker')) {
    const config = object(args[0])
    const valueElem = config.valueElem
    if (typeof valueElem !== 'string')
      throw new OperationError(ErrorCode.ParseError, 'Missing resource ticker element')
    const name = valueElem.replace(/^current_/, '')
    if (!TICKER_RESOURCES.some((entry) => entry.name === name) || tickers.has(name))
      throw new OperationError(ErrorCode.ParseError, 'Invalid resource ticker configuration')
    const limit = config.limit
    if (!Array.isArray(limit) || limit.length !== 2)
      throw new OperationError(ErrorCode.ParseError, 'Missing resource limit pair')
    tickers.set(name, {
      available: readDecimal(config.available),
      capacity: readDecimal(limit[1]),
      production: readDecimal(config.production),
    })
  }
  TICKERS.set(page, tickers)
  return tickers
}

/**
 * Read a header ticker, or null when this resource has none.
 *
 * 读取头部计时器；该资源无计时器时返回 null。
 */
export function resourceTicker(page: Page, resourceId: ResourceId): ResourceTicker | null {
  if (!hasTicker(resourceId)) return null
  const resource = RESOURCES[resourceId]
  return tickersFor(page).get(resource.name) ?? null
}

/**
 * Header display text and raw data-real value, which may be less precise than a ticker.
 *
 * 头部显示文本及 data-real 原文，其精度可能低于计时器。
 */
export type HeaderResource = Resource & {
  text: string

  dataReal: string | null
}

export function headerResource(page: Page, resourceId: ResourceId): HeaderResource | null {
  const entry = RESOURCES[resourceId]
  const node = currentNodes(page).get(entry.name)
  if (node === undefined) return null
  return {
    ...entry,
    text: node.text(),
    dataReal: node.attr('data-real') ?? null,
  }
}

/**
 * Prefer ticker stock, then data-real; return null when neither is present.
 *
 * 优先读取计时器库存，其次读取 data-real；均不存在时返回 null。
 */
export function headerBalance(page: Page, resourceId: StockResourceId): number | null {
  const ticker = resourceTicker(page, resourceId)

  if (ticker !== null) return ticker.available
  const reading = headerResource(page, resourceId)
  if (!reading || reading.dataReal === null) return null
  return readDecimal(reading.dataReal)
}

/**
 * Return reported header stocks in ascending resource-ID order.
 *
 * 按资源 ID 升序返回头部实际报告的库存。
 */
export function headerBalances(page: Page): ElementMap {
  const result: ElementMap = new Map()
  for (const id of STOCK_IDS) {
    const value = headerBalance(page, id)
    if (value !== null) result.set(id, value)
  }
  return result
}

/**
 * Read capacity and production; missing values are null and tooltips supply unticked capacity.
 *
 * 读取容量与产量；缺失字段返回 null，无计时器时从提示读取容量。
 */
export function headerCapacity(
  page: Page,
  resourceId: StockResourceId,
): { capacity: number | null; production: number | null } {
  const entry = RESOURCES[resourceId]
  const ticker = resourceTicker(page, resourceId)
  if (ticker !== null) return { capacity: ticker.capacity, production: ticker.production }
  const tooltip = tooltipPage(page, page.$(`#res_block_${entry.name}`))
  const pair = tooltip.$('span').last().text().trim().split('/')
  return { capacity: pair.length === 2 ? displayed(pair[1]!) : null, production: null }
}

/**
 * Read net supply and gross production.
 *
 * 读取净供应量与总产量。
 */
export function resourceSupply(page: Page, resourceId: SupplyResourceId): ResourceSupply {
  const entry = RESOURCES[resourceId]
  const current = currentBalance(page, entry.name)
  const total = withoutChildren(current.parent())
    .text()
    .trim()
    .match(/^\/\s*(.+)$/)?.[1]
  if (total === undefined) throw new OperationError(ErrorCode.ParseError, 'Missing resource supply')

  return { available: abbreviated(current.text()), total: abbreviated(total) }
}

function amounts(metal: number, crystal: number, deuterium: number): ResourceAmounts {
  return { metal, crystal, deuterium }
}

/**
 * Read the response planet and resources; hourly production is null without tickers.
 *
 * 读取响应的星球与资源；无生产计时器时每小时产量为 null。
 */
export function parseContext(page: Page): PlanetContext {
  const tickers = tickersFor(page)
  if (tickers.size !== 0 && tickers.size !== 3)
    throw new OperationError(ErrorCode.ParseError, 'Incomplete resource tickers')
  const resources = headerBalances(page)
  let productionPerHour: ResourceAmounts | null
  let storageCapacity: ResourceAmounts
  if (tickers.size === 0) {
    const capacities: number[] = []
    for (const { id, name } of TICKER_RESOURCES) {
      if (!resources.has(id))
        throw new OperationError(ErrorCode.ParseError, `Missing ${name} balance`)
      const { capacity } = headerCapacity(page, id)
      if (capacity === null)
        throw new OperationError(ErrorCode.ParseError, `Missing ${name} capacity`)
      capacities.push(capacity)
    }
    productionPerHour = null
    storageCapacity = amounts(capacities[0]!, capacities[1]!, capacities[2]!)
  } else {
    const metal = tickers.get('metal')!,
      crystal = tickers.get('crystal')!,
      deuterium = tickers.get('deuterium')!
    productionPerHour = amounts(metal.production, crystal.production, deuterium.production)
    storageCapacity = amounts(metal.capacity, crystal.capacity, deuterium.capacity)
  }
  return {
    ...planetObservation(page),
    resources,
    productionPerHour,
    storageCapacity,
    energy: resourceSupply(page, ENERGY_ID),
  }
}
