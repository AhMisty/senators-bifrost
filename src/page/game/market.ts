import type { Ack, PageReply } from '../../protocol/ack.ts'
import {
  headerBalance,
  headerBalances,
  isResourceId,
  isSupplyResourceId,
} from '../../protocol/context.ts'
import {
  elementId,
  integerOptions,
  prefixedId,
  requiredAttribute,
  requiredText,
  responseUrl,
  shipTableRows,
} from '../../protocol/dom.ts'
import { elementFields } from '../../protocol/elements.ts'
import { displayed, leadingDisplayed, readInteger } from '../../protocol/numbers.ts'
import { planetObservation, tooltipPage } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type {
  ElementInput,
  ElementMap,
  FormOption,
  PlanetObservation,
  PlanetReference,
} from '../../types.ts'

/**
 * Visible market lot; own lots can omit an actionable ID and do not show a purchase price.
 *
 * 可见市场商品；自己的商品可能没有操作 ID，且不显示购买价格。
 */
export type MarketLot = {
  id: number | null

  owned: boolean

  hasCancelControl: boolean

  category: number

  price: number | null

  createdAtText: string

  elements: ElementMap
}

export type MarketPage = PlanetObservation & {
  kind: 'market'

  lots: MarketLot[]

  /**
   * Sellable stock by element ID; header resource values retain raw precision, while displayed unit counts are server-rounded.
   *
   * 按元素 ID 索引的可出售库存；页头资源保留原始精度，显示的单位数量由服务端舍入。
   */
  inventory: ElementMap
  resources: ElementMap

  categories: FormOption<number>[]

  currencyId: number | null
  balance: number | null
}

export function readMarket(page: Page): MarketPage {
  if (!page.$('#market_1').length || !page.$('#market_3').length)
    throw new OperationError(ErrorCode.ParseError, 'Missing market sections')
  const available: ElementMap = new Map()
  page.$('#market_2 input[name^="lot"]').each((_index, node) => {
    const item = page.$(node)
    const id = prefixedId(requiredAttribute(item, 'name'), 'lot', 1)

    available.set(
      id,
      (isResourceId(id) && !isSupplyResourceId(id) ? headerBalance(page, id) : null) ??
        displayed(item.closest('.market_rows').find('.count_blocks').text()),
    )
  })
  const lots: MarketLot[] = []
  page.$('#market_1 .market_rows, #market_3 .market_rows').each((_index, node) => {
    const row = page.$(node)
    const icon = row.find('.market_img_utits img').attr('src')

    if (icon?.endsWith('/market.png') && !row.find('.market_button').length) return
    const category = readInteger(icon?.match(/market_(\d+)\.png/)?.[1], 1)
    const contents = tooltipPage(page, row.find('[data-tooltip-content]'))
    const entries: ElementMap = new Map()
    for (const { icon: entryIcon, count } of shipTableRows(contents.$('body'))) {
      const id = elementId(entryIcon)
      if (entries.has(id))
        throw new OperationError(ErrorCode.ParseError, 'Duplicate market lot element')
      entries.set(id, displayed(count.text()))
    }
    if (!entries.size) throw new OperationError(ErrorCode.ParseError, 'Missing market lot contents')
    const owned = row.closest('#market_3').length > 0
    const href = row.find('.market_button a[href]').attr('href')
    const link = href ? responseUrl(href, page.url) : null
    if (!owned && link === null)
      throw new OperationError(ErrorCode.ParseError, 'Missing market lot purchase link')
    const priceText = leadingDisplayed(row.find('.market_button button').text().trim())

    if (!owned && !priceText)
      throw new OperationError(ErrorCode.ParseError, 'Missing market lot price')
    lots.push({
      id: link ? readInteger(link.searchParams.get('id'), 1) : null,
      owned,
      hasCancelControl: link?.searchParams.get('mode') === 'cancel_lot',
      category,
      price: priceText ? displayed(priceText) : null,
      createdAtText: requiredText(row.find('.count_blocks'), 'market lot creation time'),
      elements: entries,
    })
  })
  const currencyImage = page
    .$('#market_2 input[name="price"]')
    .closest('.market_rows')
    .find('.market_img_utits img')
    .attr('src')
  const currency = currencyImage ? elementId(currencyImage) : null
  const resources = headerBalances(page)
  return {
    kind: 'market',
    ...planetObservation(page),
    lots,
    inventory: available,
    resources,
    categories: integerOptions(page.$('#market_2 select[name="class"]'), 1),
    currencyId: currency,
    balance: currency === null ? null : (resources.get(currency) ?? null),
  }
}

export function market(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<MarketPage>>>> {
  return routePage(session, GAME_ROUTES.market, { planetId: options.planetId }, readMarket)
}

export function marketCreateLot(
  session: Session,
  options: PlanetReference & { elements: ElementInput; price: number; category: number },
): Promise<Observed<PlanetData<Ack>>> {
  const body = new URLSearchParams({
    price: String(options.price),
    class: String(options.category),
  })
  for (const field of elementFields(options.elements, 'lot', '')) body.set(...field)
  return routeAck(session, GAME_ROUTES.marketCreateLot, {
    planetId: options.planetId,
    method: 'POST',
    body,
  })
}

export function marketBuyLot(
  session: Session,
  options: PlanetReference & { lotId: number },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.marketBuyLot, {
    planetId: options.planetId,
    method: 'POST',
    body: { id: options.lotId },
  })
}

export function marketCancelLot(
  session: Session,
  options: PlanetReference & { lotId: number },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.marketCancelLot, {
    planetId: options.planetId,
    method: 'POST',
    body: { id: options.lotId },
  })
}
