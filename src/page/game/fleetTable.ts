import type { Ack, PageReply } from '../../protocol/ack.ts'
import { coordinate } from '../../protocol/coordinates.ts'
import {
  oneIn,
  optionValue,
  renderedOptions,
  requiredAttribute,
  requiredText,
  selections,
  tableRows,
  textContent,
  withoutChildren,
} from '../../protocol/dom.ts'
import type { FleetSlots, VisibleUnit } from '../../protocol/fleet-events.ts'
import { numericMap, slots } from '../../protocol/fleet-events.ts'
import { hasSubmitControl } from '../../protocol/forms.ts'
import { displayed, readInteger } from '../../protocol/numbers.ts'
import { observation, planetObservation, tooltipPage } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type {
  Coordinate,
  ElementMap,
  Observation,
  PlanetObservation,
  PlanetReference,
} from '../../types.ts'

export type FleetTableEntry = {
  /**
   * Fleet ID exposed by recall or ACS controls; otherwise null.
   *
   * 由召回或联合攻击控件提供的舰队 ID，未提供时为 null。
   */
  id: number | null

  missionText: string

  stateText: string
  origin: Coordinate
  target: Coordinate

  departureText: string

  /**
   * Localized arrival time, or null for a deployed fleet without an upcoming event.
   *
   * 本地化抵达时间；已部署且无后续事件时为 null。
   */
  arrivalText: string | null

  countdownText: string | null
  amount: number

  units: VisibleUnit[]
  hasRecallControl: boolean

  hasACSControl: boolean
}

export type FleetPreset = {
  /**
   * Zero-based preset position used by deletion.
   *
   * 删除预设时使用的从零开始的位置。
   */
  index: number
  name: string

  ships: ElementMap
}

export type FleetTableAcs = {
  mainFleetId: number

  name: string

  invitedUsers: { id: number; name: string }[]

  statusMessage: string | null
}

export type FleetTablePage = PlanetObservation & {
  kind: 'fleetTable'

  fleetSlots: FleetSlots | null
  expeditionSlots: FleetSlots | null

  fleets: FleetTableEntry[]

  /**
   * Displayed stock can be rounded above the actual fractional balance.
   *
   * 显示库存经舍入后可能高于实际的小数库存。
   */
  availableShips: ElementMap
  presets: FleetPreset[]

  acs: FleetTableAcs | null
}

function readTooltipUnits(page: Page): VisibleUnit[] {
  return tableRows(page, 'tr').flatMap((row) => {
    const cells = row.children('td')
    if (cells.length !== 2) return []
    const name = textContent(cells.eq(0)).replace(/:$/, '')
    if (!name) return []
    return [{ elementId: null, name, amount: displayed(cells.eq(1).text().trim()) }]
  })
}

function readFleets(page: Page): FleetTableEntry[] {
  const fleets: FleetTableEntry[] = []
  for (const row of tableRows(page, 'table.ally_ranks tr')) {
    const cells = row.children('td')
    const isFleet =
      /^\d+$/.test(textContent(cells.first())) ||
      row.find('a[href*="page=galaxy"], input[name="fleetID"]').length > 0
    if (!isFleet) continue
    if (cells.length !== 9)
      throw new OperationError(ErrorCode.ParseError, 'Incomplete fleet table row')
    const recall = row.find('form[action*="sendfleetback"] input[name="fleetID"]')
    const acs = row.find('form[action*="action=acs"] input[name="fleetID"]')
    const units = readTooltipUnits(tooltipPage(page, cells.eq(2).find('[data-tooltip-content]')))
    const departure = requiredText(cells.eq(4), 'fleet departure time')
    const arrival = requiredText(cells.eq(6), 'fleet arrival time')
    const countdown = requiredText(cells.eq(7), 'fleet countdown')
    fleets.push({
      id: recall.length
        ? readInteger(recall.attr('value'), 1)
        : acs.length
          ? readInteger(acs.attr('value'), 1)
          : null,

      missionText: requiredText(withoutChildren(cells.eq(1)), 'fleet mission'),
      stateText: requiredAttribute(cells.eq(1).find('a'), 'title'),
      origin: coordinate(cells.eq(3).text().trim()),
      target: coordinate(cells.eq(5).text().trim()),
      departureText: departure,
      arrivalText: arrival === '-' ? null : arrival,
      countdownText: countdown === '-' ? null : countdown,
      amount: displayed(cells.eq(2).text().trim()),
      units,
      hasRecallControl: hasSubmitControl(page, recall),
      hasACSControl: hasSubmitControl(page, acs),
    })
  }
  return fleets
}

function readAvailableShips(page: Page): ElementMap {
  const available: ElementMap = new Map()
  for (const field of selections(page.$('input[name^="ship"]'))) {
    const match = field.attr('name')?.match(/^ship(\d+)$/)
    if (!match) continue
    const id = readInteger(match[1], 1)
    if (available.has(id))
      throw new OperationError(ErrorCode.ParseError, 'Duplicate fleet selector ship')
    const row = field.closest('.build_box')
    available.set(id, displayed(oneIn(row, `#ship${id}_value`).text()))
  }
  return available
}

function readFleetPresets(page: Page): FleetPreset[] {
  const names = page.$('.fl_groop_link_name')
  if (!names.length) return []
  const data = page.scripts.binding('fleetGroopShip')
  if (!Array.isArray(data))
    throw new OperationError(ErrorCode.ParseError, 'Invalid fleet preset data')
  return selections(names).map((element) => {
    const index = readInteger(
      page.staticCall(requiredAttribute(element, 'onclick'), 'GroopShips')[0],
    )
    return { index, name: textContent(element), ships: numericMap(data[index]) }
  })
}

function readAcsPanel(page: Page): FleetTableAcs | null {
  const forms = page
    .$('form[action*="action=acs"]')
    .filter((_index, node) => page.$(node).find('#acsName').length > 0)
  if (!forms.length) return null
  if (forms.length !== 1) throw new OperationError(ErrorCode.ParseError, 'Ambiguous ACS panel')
  const form = forms.eq(0)
  const members = form.find('select')
  if (members.length !== 1)
    throw new OperationError(ErrorCode.ParseError, 'Invalid ACS member list')

  const outcome = form
    .find('td[colspan="2"]')
    .filter((_index, node) => page.$(node).attr('id') !== 'acsName')
  if (outcome.length > 1) throw new OperationError(ErrorCode.ParseError, 'Ambiguous ACS status')
  return {
    mainFleetId: readInteger(form.find('input[name="fleetID"]').attr('value'), 1),
    name: requiredText(form.find('#acsName'), 'ACS group name'),
    invitedUsers: renderedOptions(members).map(({ option }) => ({
      id: readInteger(optionValue(option), 1),
      name: textContent(option),
    })),
    statusMessage: outcome.length ? textContent(outcome) : null,
  }
}

/**
 * A normal fleet table without a panel means the requested fleet cannot be managed as an ACS.
 *
 * 正常舰队表没有面板时，表示请求的舰队不能进行联合攻击管理。
 */
export type FleetACSPage = Observation & { kind: 'fleetACS'; acs: FleetTableAcs | null }

function requireFleetSelector(page: Page): void {
  page.one('form[action*="fleetStep1"]')
}

export function readFleetACS(page: Page): FleetACSPage {
  const acs = readAcsPanel(page)
  if (acs === null) requireFleetSelector(page)
  return { kind: 'fleetACS', ...observation(page), acs }
}

export function readFleetTable(page: Page): FleetTablePage {
  requireFleetSelector(page)
  return {
    kind: 'fleetTable',
    ...planetObservation(page),
    ...slots(page),
    fleets: readFleets(page),
    availableShips: readAvailableShips(page),
    presets: readFleetPresets(page),
    acs: readAcsPanel(page),
  }
}

export function fleetTable(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<FleetTablePage>>>> {
  return routePage(session, GAME_ROUTES.fleetTable, { planetId: options.planetId }, readFleetTable)
}

export function fleetTableRecall(
  session: Session,
  options: { fleetId: number },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.fleetTable, {
    query: { action: 'sendfleetback' },
    method: 'POST',
    body: { fleetID: options.fleetId },
  })
}

/**
 * Open the ACS panel, creating the group if the fleet has none.
 *
 * 打开联合攻击面板；舰队尚无组时会创建组。
 */
export function fleetTableOpenACS(
  session: Session,
  options: { fleetId: number },
): Promise<Observed<PageReply<FleetACSPage>>> {
  return routePage(
    session,
    GAME_ROUTES.fleetTable,
    {
      query: { action: 'acs' },
      method: 'POST',
      body: { fleetID: options.fleetId },
    },
    readFleetACS,
  )
}

export function fleetTableRenameACS(
  session: Session,
  options: { fleetId: number; name: string },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.fleetTable, {
    query: { action: 'acs' },
    method: 'POST',
    body: { fleetID: options.fleetId, acsName: options.name },
  })
}

export function fleetTableInviteACS(
  session: Session,
  options: { fleetId: number; username: string },
): Promise<Observed<PageReply<FleetACSPage>>> {
  return routePage(
    session,
    GAME_ROUTES.fleetTable,
    {
      query: { action: 'acs' },
      method: 'POST',
      body: { fleetID: options.fleetId, username: options.username },
    },
    readFleetACS,
  )
}

export function fleetTableDeletePreset(
  session: Session,
  options: { index: number },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.fleetTableDeleteGroup, {
    method: 'POST',
    body: { id: options.index },
  })
}
