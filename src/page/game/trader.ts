import type { Ack, PageReply } from '../../protocol/ack.ts'
import { PLANET_STOCK_IDS, readPlanetStockId } from '../../protocol/context.ts'
import type { PlanetStockId } from '../../protocol/context.ts'
import { elementId, requiredAttribute, selections } from '../../protocol/dom.ts'
import { fixedElementBody } from '../../protocol/elements.ts'
import { fieldValue, hasSubmitControl } from '../../protocol/forms.ts'
import { displayed, readDecimal } from '../../protocol/numbers.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import { object } from '../../protocol/script-data.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type { ElementInput, PlanetObservation, PlanetReference } from '../../types.ts'

export type TraderResource = {
  resourceId: PlanetStockId
  name: string

  hasSubmitControl: boolean
}

export type TraderPage = PlanetObservation & {
  kind: 'trader'

  resources: TraderResource[]

  paragraphs: string[]

  fee: number | null
}

export function readTrader(page: Page): TraderPage {
  const catalogue = page.one('div#trader')
  const paragraphs = selections(page.$('#content p')).map((paragraph) => paragraph.text().trim())

  const merchantPrice = paragraphs.at(-1)?.match(/\d[\d.,]*/g)
  return {
    kind: 'trader',
    ...planetObservation(page),
    resources: selections(catalogue.find('.trader_col')).map((item) => {
      const image = item.find('[src]').first()
      return {
        resourceId: readPlanetStockId(elementId(image.attr('src'))),

        name: requiredAttribute(image, 'title'),
        hasSubmitControl: hasSubmitControl(page, item.find('input[name="resource"]')),
      }
    }),
    paragraphs,
    fee: merchantPrice?.length === 1 ? displayed(merchantPrice[0]) : null,
  }
}

export function trader(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<TraderPage>>>> {
  return routePage(session, GAME_ROUTES.trader, { planetId: options.planetId }, readTrader)
}

export type TraderTradePage = PlanetObservation & {
  kind: 'traderTrade'

  resourceId: PlanetStockId

  sourceResourceName: string | null

  rates: Map<PlanetStockId, number>

  targetResourceIds: PlanetStockId[]
}

export function readTraderTrade(page: Page): TraderTradePage {
  const form = page.one('form#trader')
  const resource = readPlanetStockId(fieldValue(form, 'resource'))
  const targets = selections(form.find('input[name^="trade["]')).map((field) =>
    readPlanetStockId(field.attr('data-resource')),
  )
  const rates = new Map(
    Object.entries(object(page.scripts.binding('charge'))).map(([id, rate]) => [
      readPlanetStockId(id),
      readDecimal(rate),
    ]),
  )
  if (
    targets.some((id) => {
      const rate = rates.get(id)
      return id === resource || !rate || rate <= 0
    })
  )
    throw new OperationError(ErrorCode.ParseError, 'Missing or invalid trade rate')

  const sourceName = form.find('tr').first().children('td').first().text().trim() || null
  return {
    kind: 'traderTrade',
    ...planetObservation(page),
    resourceId: resource,
    sourceResourceName: sourceName,
    rates,
    targetResourceIds: targets,
  }
}

export function traderTrade(
  session: Session,
  options: PlanetReference & { resourceId: PlanetStockId },
): Promise<Observed<PlanetData<PageReply<TraderTradePage>>>> {
  return routePage(
    session,
    GAME_ROUTES.traderTrade,
    { planetId: options.planetId, query: { resource: options.resourceId } },
    readTraderTrade,
  )
}

export function traderSend(
  session: Session,
  options: PlanetReference & { resourceId: PlanetStockId; receive: ElementInput<PlanetStockId> },
): Promise<Observed<PlanetData<Ack>>> {
  const body = fixedElementBody(options.receive, PLANET_STOCK_IDS, 'trade[', ']')
  body.set('resource', String(options.resourceId))
  return routeAck(session, GAME_ROUTES.traderSend, {
    planetId: options.planetId,
    method: 'POST',
    body,
  })
}
