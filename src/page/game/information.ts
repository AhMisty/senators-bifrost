import type { Ack, PageReply } from '../../protocol/ack.ts'
import { coordinateIn } from '../../protocol/coordinates.ts'
import type { Selection } from '../../protocol/dom.ts'
import {
  contentText,
  elementId,
  imageId,
  oneIn,
  renderedOptions,
  requiredAttribute,
  selections,
  textContent,
  withoutChildren,
} from '../../protocol/dom.ts'
import { elementBody } from '../../protocol/elements.ts'
import { displayed, readAmount, readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { OperationError } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type {
  Coordinate,
  ElementInput,
  ElementMap,
  Observation,
  PlanetReference,
} from '../../types.ts'
import { ErrorCode } from '../../types.ts'

/**
 * Leaf tables retain visible headers, rows and resource icon IDs in document order.
 *
 * 保留末级表格中的标题、行及资源图标 ID，顺序与页面一致。
 */
export type InformationTable = {
  headers: string[][]

  rows: string[][]

  resourceIds: number[]
}

export type InformationAttribute = {
  name: string
  text: string

  icon: string | null
}

export type InformationGateTarget = {
  planetId: number

  label: string

  coordinate: Coordinate | null
}

/**
 * Jump-gate state shown for element 43; unavailable controls remain null or empty.
 *
 * 元素 43 的跃迁门状态；未提供的控件为 null 或空列表。
 */
export type InformationGate = {
  /**
   * Seconds until the source gate is ready, or zero when ready.
   *
   * 起点跃迁门恢复可用的剩余秒数，可用时为零。
   */
  cooldownSeconds: number

  cooldownEndsAtText: string | null

  /**
   * Target moons offered by the form; labels can include recharge times.
   *
   * 表单提供的目标月球；标签可能包含充能时间。
   */
  targets: InformationGateTarget[]

  availableShips: ElementMap | null
}

export type InformationPage = Observation & {
  kind: 'information'

  elementId: number

  name: string

  description: string

  rapidfire: { to: ElementMap; from: ElementMap }

  tables: InformationTable[]

  attributes: InformationAttribute[]

  gate: InformationGate | null

  /**
   * Missile stock shown for element 44; null when no silo controls are rendered.
   *
   * 元素 44 显示的导弹库存；未显示导弹井控件时为 null。
   */
  missiles: ElementMap | null
}

function readTables(page: Page): InformationTable[] {
  return selections(page.$('.info_elements table'))
    .filter((table) => !table.find('table').length)
    .map((table) => {
      const lines = selections(table.find('tr'))
      return {
        headers: lines
          .filter((line) => line.children('th').length)
          .map((line) => selections(line.children('th')).map((cell) => textContent(cell))),
        rows: lines
          .filter((line) => line.children('td').length)
          .map((line) => selections(line.children('td')).map((cell) => textContent(cell))),

        resourceIds: selections(table.find('th img')).flatMap((img) => {
          const resource = imageId(img.attr('src'))
          return resource === null ? [] : [resource]
        }),
      }
    })
}

function readRapidfire(page: Page): { to: ElementMap; from: ElementMap } {
  const rapidfire = { to: new Map<number, number>(), from: new Map<number, number>() }
  page.$('.card-img-text').each((_index, node) => {
    const badge = page.$(node)
    const target = elementId(badge.siblings('img').attr('src'))
    const direction = badge.hasClass('background-color-red') ? rapidfire.from : rapidfire.to
    if (direction.has(target))
      throw new OperationError(ErrorCode.ParseError, 'Duplicate rapid fire entry')
    direction.set(target, displayed(badge.text()))
  })
  return rapidfire
}

function readAttributes(page: Page): InformationAttribute[] {
  return selections(page.$('.info_elements .card-body'))
    .filter((card) => card.children('.card-text').length > 0)
    .map((card) => ({
      name: textContent(card.children('.card-title')),
      text: contentText(card.children('.card-text')),
      icon:
        card
          .children('.card-img-left')
          .attr('style')
          ?.match(/information\/([^/)]+)/)?.[1] ?? null,
    }))
}

function readStock(page: Page, fields: Selection, amountId: (id: number) => string): ElementMap {
  const stock: ElementMap = new Map()
  fields.each((_index, node) => {
    const control = page.$(node)
    const id = readInteger(requiredAttribute(control, 'name').match(/\[(\d+)\]$/)?.[1], 1)
    stock.set(id, displayed(oneIn(control.closest('tr'), amountId(id)).text()))
  })
  return stock
}

function readGate(page: Page): InformationGate | null {
  const anchor = '.info_elements th[colspan="3"].left'
  if (!page.$(anchor).length) return null
  const gate = page.one(anchor).closest('table')
  const countdown = gate.find('.countdown[data-time]')
  const selector = gate.find('select[name="jmpto"]')
  const available = readStock(page, gate.find('input[name^="ship["]'), (id) => `#ship${id}_value`)
  return {
    cooldownSeconds: countdown.length ? readAmount(countdown.attr('data-time')) : 0,
    cooldownEndsAtText:
      countdown.length === 1
        ? textContent(withoutChildren(countdown.parent())).replace(/\s*\(\s*\)$/, '') || null
        : null,
    targets: renderedOptions(selector).map(({ option }) => ({
      planetId: readInteger(option.attr('value'), 1),
      label: textContent(option),
      coordinate: coordinateIn(option.text()),
    })),

    availableShips: selector.length ? available : null,
  }
}

function readMissiles(page: Page): ElementMap | null {
  const missiles = readStock(page, page.$('input[name^="missile["]'), (id) => `#missile_${id}`)
  return missiles.size ? missiles : null
}

export function readInformation(page: Page): InformationPage {
  const element = elementId(page.$('.info_elements > .content_box .image img').attr('src'))
  return {
    kind: 'information',
    ...observation(page),
    elementId: element,
    name: textContent(page.$('.academy_info_text_h')),
    description: contentText(page.$('.info_description')),
    rapidfire: readRapidfire(page),
    tables: readTables(page),
    attributes: readAttributes(page),
    gate: readGate(page),
    missiles: readMissiles(page),
  }
}

export function information(
  session: Session,
  options: PlanetReference & { elementId: number },
): Promise<Observed<PageReply<InformationPage>>> {
  return routePage(
    session,
    GAME_ROUTES.information,
    { planetId: options.planetId, query: { id: options.elementId } },
    readInformation,
    false,
  )
}

export function informationSendFleet(
  session: Session,
  options: { origin: PlanetReference; target: PlanetReference; ships: ElementInput },
): Promise<Observed<Ack>> {
  const body = elementBody(options.ships, 'ship[', ']')
  body.set('jmpto', String(options.target.planetId))
  return routeAck(
    session,
    GAME_ROUTES.informationSendFleet,
    {
      planetId: options.origin.planetId,
      method: 'POST',
      body,
    },
    false,
  )
}

/**
 * Dismantle missiles on the selected planet.
 *
 * 拆除所选星球上的导弹。
 *
 * @param options - Missile quantities; omitted counts for elements 502 and 503 are sent as zero.
 *
 * 导弹数量；元素 502 和 503 的数量省略时按零提交。
 */
export function informationDestroyMissiles(
  session: Session,
  options: PlanetReference & { missiles: ElementInput },
): Promise<Observed<Ack>> {
  const body = new URLSearchParams({ 'missile[502]': '0', 'missile[503]': '0' })
  for (const [name, amount] of elementBody(options.missiles, 'missile[', ']'))
    body.set(name, amount)
  return routeAck(
    session,
    GAME_ROUTES.informationDestroyMissiles,
    {
      planetId: options.planetId,
      method: 'POST',
      body,
    },
    false,
  )
}
