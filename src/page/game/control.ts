import type { PageReply } from '../../protocol/ack.ts'
import { headerBalance, TICKER_RESOURCES } from '../../protocol/context.ts'
import { coordinateIn } from '../../protocol/coordinates.ts'
import type { Selection } from '../../protocol/dom.ts'
import {
  ELEMENT_ICON_SELECTOR,
  elementId,
  requiredLinkId,
  selections,
  textContent,
} from '../../protocol/dom.ts'
import { displayed, readAmount, readDecimal } from '../../protocol/numbers.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { PlanetReference, Coordinate, ElementMap, PlanetObservation } from '../../types.ts'
import { ErrorCode } from '../../types.ts'

const EMPIRE_SECTIONS = 5

const FIRST_ELEMENT_SECTION = 2

export type ControlSection = {
  name: string

  elements: ElementMap
}

/**
 * Planet or moon values are server-rounded except current-planet stock from its header; productionPerHour excludes basic income.
 *
 * 行星或月球数值由服务端舍入，当前星球库存优先取页头原始值；productionPerHour 不含基础收入。
 */
export type ControlPlanet = {
  id: number

  type: 1 | 3
  name: string
  coordinate: Coordinate | null

  fields: { used: number; total: number }

  resources: ElementMap

  productionPerHour: ElementMap

  sections: ControlSection[]
}

export type ControlPage = PlanetObservation & {
  kind: 'control'
  planets: ControlPlanet[]
}

type EmpireSection = { name: string; rows: Selection[] }

function empireSections(page: Page, column: Selection): EmpireSection[] {
  const sections: EmpireSection[] = []
  let name = ''
  let rows: Selection[] = []
  for (const node of column.find('.imper_block_th, .imper_block_td').toArray()) {
    const item = page.$(node)
    if (item.is('.imper_block_th')) {
      if (rows.length) sections.push({ name, rows })
      name = textContent(item)
      rows = []
    } else rows.push(item)
  }
  if (rows.length) sections.push({ name, rows })
  return sections
}

function sectionIds(page: Page, column: Selection): number[][] {
  return empireSections(page, column).map(({ rows }) =>
    rows.map((row) => elementId(row.find(ELEMENT_ICON_SELECTOR).attr('src'))),
  )
}

function labelColumn(page: Page): Selection {
  return page
    .$('.imper_left_part')
    .filter((_index, node) => page.$(node).find('.imper_block_th').length > 0)
    .first()
}

function controlPlanet(
  page: Page,
  column: Selection,
  ids: number[][],
  names: string[],
): ControlPlanet {
  const overview = column.find('a[href*="page=overview"]')
  const id = requiredLinkId(page, overview, 'cp')
  const info = column.find('.imper_block_image .imper_block_info_text')

  const fields = textContent(info.eq(2)).split('/')
  if (fields.length !== 2)
    throw new OperationError(ErrorCode.ParseError, 'Missing empire field count')
  const values = empireSections(page, column).map(({ rows }) =>
    rows.map((row) => displayed(textContent(row))),
  )
  if (values.length !== ids.length)
    throw new OperationError(ErrorCode.ParseError, 'Incomplete empire planet column')
  const read = (group: number): ElementMap => {
    const groupIds = ids[group]!
    const groupValues = values[group]!
    if (groupValues.length !== groupIds.length)
      throw new OperationError(ErrorCode.ParseError, `Incomplete empire column section ${group}`)
    const elements: ElementMap = new Map()
    for (const [index, element] of groupIds.entries()) {
      if (elements.has(element))
        throw new OperationError(ErrorCode.ParseError, 'Duplicate empire element')
      const value = groupValues[index]!
      elements.set(element, group === 1 ? readDecimal(value) : readAmount(value))
    }
    return elements
  }
  const resources = read(0)

  if (id === page.planetId())
    for (const { id: resourceId } of TICKER_RESOURCES) {
      const balance = headerBalance(page, resourceId)
      if (balance !== null && resources.has(resourceId)) resources.set(resourceId, balance)
    }
  return {
    id,
    type: column.is('.imper_moon') ? 3 : 1,
    name: textContent(overview),
    coordinate: coordinateIn(textContent(info.eq(1))),
    fields: { used: displayed(fields[0]!), total: displayed(fields[1]!) },
    resources,
    productionPerHour: read(1),
    sections: names.slice(FIRST_ELEMENT_SECTION).map((name, index) => {
      if (!name) throw new OperationError(ErrorCode.ParseError, 'Missing empire section name')
      return { name, elements: read(index + FIRST_ELEMENT_SECTION) }
    }),
  }
}

/**
 * Read icon-aligned columns, excluding the total column that has no planet link.
 *
 * 按图标行对齐读取星球列，排除没有星球链接的合计列。
 */
export function readControl(page: Page): ControlPage {
  const iconColumn = page
    .$('.imper_block_td')
    .filter((_index, node) => page.$(node).find(ELEMENT_ICON_SELECTOR).length > 0)
    .first()
    .parent()
  const ids = sectionIds(page, iconColumn)

  if (ids.length !== EMPIRE_SECTIONS)
    throw new OperationError(ErrorCode.ParseError, 'Incomplete empire element column')

  const names = empireSections(page, labelColumn(page)).map(({ name }) => name)
  if (names.length !== ids.length)
    throw new OperationError(ErrorCode.ParseError, 'Incomplete empire label column')
  const planets: ControlPlanet[] = []
  for (const column of selections(page.$('#ipper_planets td.imper_f'))) {
    if (!column.find('a[href*="page=overview"]').length) continue
    planets.push(controlPlanet(page, column, ids, names))
  }
  if (!planets.length) throw new OperationError(ErrorCode.ParseError, 'Empire page lists no planet')
  return { kind: 'control', ...planetObservation(page), planets }
}

export function control(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<ControlPage>>>> {
  return routePage(session, GAME_ROUTES.control, { planetId: options.planetId }, readControl)
}
