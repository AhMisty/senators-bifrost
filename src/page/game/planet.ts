import type { Ack, PageReply } from '../../protocol/ack.ts'
import { textContent } from '../../protocol/dom.ts'
import { readDecimal, readInteger, readQuantity } from '../../protocol/numbers.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Coordinate, PlanetObservation, PlanetReference } from '../../types.ts'
import { ErrorCode } from '../../types.ts'

/**
 * Purchased counts drive the geometric price curve; maximumPurchase is the form's per-request maximum.
 *
 * 已购买数量决定等比价格曲线；maximumPurchase 是表单标示的单次购买上限。
 */
export type PlanetPurchase = {
  total: number

  purchased: number

  basePrice: number

  priceFactor: number

  maximumPurchase: number
}

export type PlanetPage = PlanetObservation & {
  kind: 'planet'
  fields: PlanetPurchase
  diameter: PlanetPurchase

  /**
   * Relocation is available only for planets; moons have no independent position.
   *
   * 迁移仅适用于行星；月球没有独立轨道位置。
   */
  relocation: {
    coordinate: Coordinate

    restriction: string
  } | null
}

export function readPlanet(page: Page): PlanetPage {
  const purchase = (kind: 'fields' | 'diameters', input: 'filds' | 'diameters'): PlanetPurchase => {
    const section = page.one(`#box_${kind}`).closest('.build_box')
    const total = section
      .find('.head > span')
      .first()
      .text()
      .match(/^\s*([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(?=\s|\(|$)/i)
    if (!total) throw new OperationError(ErrorCode.ParseError, `Missing ${kind} total`)
    return {
      total: readQuantity(total[1]),
      purchased: readQuantity(page.attribute(`#purchased_${kind}`, 'value')),
      basePrice: readDecimal(page.attribute(`#type_${kind}`, 'value')),
      priceFactor: readDecimal(page.attribute(`#power_${kind}`, 'value')),
      maximumPurchase: readQuantity(page.attribute(`[name="${input}"]`, 'max'), 1),
    }
  }
  const teleport = page.$('#box_teleport')

  const heading = teleport.closest('.build_box').children('.head').clone()
  heading.find('.prem_open_btn').remove()
  return {
    kind: 'planet',
    ...planetObservation(page),
    fields: purchase('fields', 'filds'),
    diameter: purchase('diameters', 'diameters'),
    relocation: teleport.length
      ? {
          coordinate: {
            galaxy: readInteger(page.attribute('[name="galaxyt"]', 'value'), 1),
            system: readInteger(page.attribute('[name="systemt"]', 'value'), 1),
            planet: readInteger(page.attribute('[name="planetst"]', 'value'), 1),
          },
          restriction: textContent(heading),
        }
      : null,
  }
}

export function planet(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<PlanetPage>>>> {
  return routePage(session, GAME_ROUTES.planet, { planetId: options.planetId }, readPlanet)
}

export function planetCoord(
  session: Session,
  options: { origin: PlanetReference; target: Coordinate },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.planetCoord, {
    planetId: options.origin.planetId,
    method: 'POST',
    body: {
      galaxyt: options.target.galaxy,
      systemt: options.target.system,
      planetst: options.target.planet,
    },
  })
}

/**
 * Spend dark matter to buy additional building fields.
 *
 * 消耗暗物质购买额外建筑空间。
 */
export function planetField(
  session: Session,
  options: PlanetReference & { amount: number },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.planetField, {
    planetId: options.planetId,
    method: 'POST',
    body: { filds: options.amount },
  })
}

/**
 * Spend dark matter to increase diameter by the requested amount.
 *
 * 消耗暗物质，将直径增加指定数量。
 */
export function planetDiameter(
  session: Session,
  options: PlanetReference & { amount: number },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.planetDiameter, {
    planetId: options.planetId,
    method: 'POST',
    body: { diameters: options.amount },
  })
}

export function planetGenerateName(session: Session): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.planetGenerateName)
}
