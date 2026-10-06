import type { Session } from '../session.ts'
import { ErrorCode } from '../types.ts'
import type { PlanetReference } from '../types.ts'
import type { Ack } from './ack.ts'
import { headerBalance, readStockResourceId } from './context.ts'
import type { StockResourceId } from './context.ts'
import { readAmount, readDecimal, readInteger } from './numbers.ts'
import type { Page } from './page.ts'
import { routeAck } from './request.ts'
import type { Observed, PlanetData } from './result.ts'
import { OperationError } from './result.ts'
import type { PageRoute } from './routes.ts'
import { object } from './script-data.ts'
import type { StaticValue } from './script-data.ts'

/**
 * Direct-purchase item priced by level.
 *
 * 按等级定价的直购条目。
 */
export type LevelShopItem = {
  elementId: number
  name: string

  owned: number

  /**
   * Total price is basePrice * priceFactor ** (owned + purchased levels).
   *
   * 总价为 basePrice * priceFactor ** (owned + 购买等级数)。
   */
  basePrice: number
  priceFactor: number
}

/**
 * Direct-purchase item priced per unit.
 *
 * 按单个单位定价的直购条目。
 */
export type UnitShopItem = {
  elementId: number
  name: string

  owned: number

  unitPrice: number
}

/**
 * Shop currency, balance and items; balance is null when unreported.
 *
 * 商店货币、余额与商品；未显示余额时 balance 为 null。
 */
export type ShopCatalogue<I> = {
  currencyId: StockResourceId

  balance: number | null
  items: I[]
}

type ShopShape = {
  total: string

  missing: string
}

const LEVEL_SHOP: ShopShape = {
  total: '#total_price_factor',
  missing: 'Missing level purchase total',
}

const UNIT_SHOP: ShopShape = {
  total: '#total_price_count',
  missing: 'Missing unit purchase total',
}

type PurchaseEntry = {
  elementId: number

  owned: string
  name: string

  price: StaticValue

  factor: StaticValue
}

function shopCatalogue<I>(
  page: Page,
  shape: ShopShape,
  item: (entry: PurchaseEntry) => I,
): ShopCatalogue<I> {
  if (!page.$(shape.total).length) throw new OperationError(ErrorCode.ParseError, shape.missing)
  const currencyId = readStockResourceId(
    page
      .$('#price')
      .attr('class')
      ?.match(/colore(\d+)/)?.[1],
  )
  return {
    currencyId,
    balance: headerBalance(page, currencyId),
    items: Object.entries(object(page.scripts.binding('CostInfo'))).map(([id, value]) => {
      if (
        !Array.isArray(value) ||
        value.length !== 4 ||
        typeof value[0] !== 'string' ||
        typeof value[1] !== 'string'
      )
        throw new OperationError(ErrorCode.ParseError, 'Invalid direct purchase item')
      return item({
        elementId: readInteger(id, 1),
        owned: value[0],
        name: value[1],
        price: value[2]!,
        factor: value[3]!,
      })
    }),
  }
}

/**
 * Read a building or research direct-purchase catalogue.
 *
 * 读取建筑或研究直购目录。
 */
export function readLevelShop(page: Page): ShopCatalogue<LevelShopItem> {
  return shopCatalogue(page, LEVEL_SHOP, ({ elementId, owned, name, price, factor }) => ({
    elementId,
    owned: readAmount(owned),
    name,
    basePrice: readDecimal(price),
    priceFactor: readDecimal(factor),
  }))
}

/**
 * Read a ship or defense direct-purchase catalogue.
 *
 * 读取舰船或防御直购目录。
 */
export function readUnitShop(page: Page): ShopCatalogue<UnitShopItem> {
  return shopCatalogue(page, UNIT_SHOP, ({ elementId, owned, name, price }) => ({
    elementId,
    owned: readAmount(owned),
    name,
    unitPrice: readDecimal(price),
  }))
}

/**
 * Submit a direct purchase using server fields Element and count.
 *
 * 按服务端 Element 与 count 字段提交直购。
 */
export function buyElement(
  session: Session,
  route: PageRoute,
  options: PlanetReference & { elementId: number; amount: number },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, route, {
    planetId: options.planetId,
    method: 'POST',
    body: { Element: options.elementId, count: options.amount },
  })
}
