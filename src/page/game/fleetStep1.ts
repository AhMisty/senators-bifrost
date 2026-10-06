import type { Ack, PageReply } from '../../protocol/ack.ts'
import { addressParams, readLocationType } from '../../protocol/coordinates.ts'
import { requiredAttribute, selections } from '../../protocol/dom.ts'
import { elementBody } from '../../protocol/elements.ts'
import type { FleetOption } from '../../protocol/fleet-forms.ts'
import { readFleetOptions } from '../../protocol/fleet-forms.ts'
import { controlValue, requiredFieldValue } from '../../protocol/forms.ts'
import { readDecimal, readInteger, readQuantity } from '../../protocol/numbers.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import { object } from '../../protocol/script-data.ts'
import { readFleetSpeed } from '../../protocol/values.ts'
import type { FleetSpeed } from '../../protocol/values.ts'
import type { FlightShip } from '../../rules/new-star.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type { ElementInput, Location, PlanetObservation, PlanetReference } from '../../types.ts'

export type Shortcut = {
  id: number
  name: string
  target: Location
}

/**
 * Omit id to insert a shortcut; a stored id overwrites it.
 *
 * 省略 id 新建快捷目标，已有 id 则覆盖该目标。
 */
export type ShortcutInput = {
  id?: number
  name: string
  target: Location
}

/**
 * Flight constants supplied by the server; maximumFleetSpeed is the slowest selected ship speed.
 *
 * 服务端提供的飞行参数；maximumFleetSpeed 是所选舰船中的最低速度。
 */
export type FleetFlightPreview = {
  fleetSpeedFactor: number
  minimumFleetSeconds: number

  maximumFleetSpeed: number
}

export type FleetStep1Page = PlanetObservation & {
  kind: 'fleetStep1'

  /**
   * Session draft token required by the next fleet step.
   *
   * 下一步舰队操作必须使用的会话草稿令牌。
   */
  token: string

  origin: Location

  ships: Map<number, FlightShip>

  /**
   * Cargo capacity before flight fuel is deducted.
   *
   * 扣除飞行燃料前的载货容量。
   */
  capacity: number

  flightPreview: FleetFlightPreview

  /**
   * Values 1–10 represent 10%–100% of maximum fleet speed.
   *
   * 取值 1–10 对应舰队最高速度的 10%–100%。
   */
  speedOptions: FleetOption<FleetSpeed>[]

  targetTypes: FleetOption<Location['type']>[]

  colonies: Location[]

  shortcuts: Shortcut[]

  acsTargets: Map<number, Location>
}

function readColonies(page: Page): Location[] {
  return selections(page.$('.fleet_my_planet_kord[onclick*="setTarget("]')).map((row) => {
    const call = page.staticCall(requiredAttribute(row, 'onclick'), 'setTarget')
    if (call.length !== 4) throw new OperationError(ErrorCode.ParseError, 'Invalid colony target')
    return {
      galaxy: readInteger(call[0], 1),
      system: readInteger(call[1], 1),
      planet: readInteger(call[2], 1),
      type: readLocationType(call[3]),
    }
  })
}

function readShortcuts(page: Page): Shortcut[] {
  const editor = page.one('#shortcut-data')
  return selections(editor.find('.shortcut-isset')).map((row) => {
    const input = row.find('input[name$="[name]"]')
    return {
      id: readInteger(input.attr('name')?.match(/^shortcut\[(\d+)\]\[name\]$/)?.[1], 1),
      name: requiredAttribute(input, 'value'),
      target: {
        galaxy: readInteger(row.find('input[name$="[galaxy]"]').attr('value'), 1),
        system: readInteger(row.find('input[name$="[system]"]').attr('value'), 1),
        planet: readInteger(row.find('input[name$="[planet]"]').attr('value'), 1),
        type: readLocationType(controlValue(row.find('select[name$="[type]"]'))),
      },
    }
  })
}

function readACSTargets(page: Page): Map<number, Location> {
  const targets = new Map<number, Location>()
  for (const anchor of selections(page.$('a[href^="javascript:setACSTarget("]'))) {
    const call = page.staticCall(requiredAttribute(anchor, 'href'), 'setACSTarget')
    if (call.length !== 5) throw new OperationError(ErrorCode.ParseError, 'Invalid ACS target')
    const group = readInteger(call[4], 1)
    if (targets.has(group)) throw new OperationError(ErrorCode.ParseError, 'Ambiguous ACS group')
    targets.set(group, {
      galaxy: readInteger(call[0], 1),
      system: readInteger(call[1], 1),
      planet: readInteger(call[2], 1),
      type: readLocationType(call[3]),
    })
  }
  return targets
}

export function readFleetStep1(page: Page): FleetStep1Page {
  /**
   * The template assigns data twice; the last assignment supplies the fleet draft.
   *
   * 模板对 data 赋值两次，最后一次包含舰队草稿。
   */
  const data = object(page.scripts.binding('data', 'last'))
  const planet = object(data.planet)
  const shipData = object(data.ships)
  const flightPreview: FleetFlightPreview = {
    fleetSpeedFactor: readDecimal(data.gamespeed),
    minimumFleetSeconds: readDecimal(data.fleetMinDuration),
    maximumFleetSpeed: readDecimal(data.maxspeed),
  }
  const ships = new Map<number, FlightShip>(
    Object.entries(shipData).map(([id, item]) => {
      const ship = object(item)
      return [
        readInteger(id, 1),
        {
          amount: readQuantity(ship.amount),
          speed: readDecimal(ship.speed),
          consumption: readDecimal(ship.consumption),
        },
      ]
    }),
  )
  return {
    kind: 'fleetStep1',
    ...planetObservation(page),
    token: requiredFieldValue(page.form('fleetStep2'), 'token'),
    origin: {
      galaxy: readInteger(planet.galaxy, 1),
      system: readInteger(planet.system, 1),
      planet: readInteger(planet.planet, 1),
      type: readLocationType(planet.planet_type),
    },
    ships,
    capacity: readDecimal(data.fleetroom),
    flightPreview,
    speedOptions: readFleetOptions(page, 'speed', readFleetSpeed),
    targetTypes: readFleetOptions(page, 'type', readLocationType),
    colonies: readColonies(page),
    shortcuts: readShortcuts(page),
    acsTargets: readACSTargets(page),
  }
}

/**
 * Create a fleet draft and optionally save its ships as a named preset.
 *
 * 创建舰队草稿，可同时将舰船保存为命名预设。
 */
export function fleetStep1(
  session: Session,
  options: { origin: PlanetReference; ships: ElementInput; presetName?: string },
): Promise<Observed<PlanetData<PageReply<FleetStep1Page>>>> {
  const body = elementBody(options.ships, 'ship', '')
  if (options.presetName !== undefined) body.set('save_groop', options.presetName)
  return routePage(
    session,
    GAME_ROUTES.fleetStep1,
    {
      planetId: options.origin.planetId,
      method: 'POST',
      body,
    },
    readFleetStep1,
  )
}

export function fleetStep1CheckTarget(
  session: Session,
  options: { origin: PlanetReference; target: Location },
): Promise<Observed<Ack>> {
  return routeAck(
    session,
    GAME_ROUTES.fleetStep1CheckTarget,
    {
      planetId: options.origin.planetId,
      query: { ...addressParams(options.target), planet_type: options.target.type },
    },
    false,
  )
}

function shortcutKey(shortcut: ShortcutInput, index: number): string {
  return shortcut.id === undefined ? `new_${index}` : String(shortcut.id)
}

/**
 * Unknown IDs insert rows; empty names delete stored rows. Names must be safe for HTML because New-Star renders them without escaping.
 *
 * 未知 ID 新建目标，空名称删除已有目标。New-Star 不转义名称，调用方应提供可安全显示于 HTML 的名称。
 */
export function fleetStep1SaveShortcuts(
  session: Session,
  options: { shortcuts: readonly ShortcutInput[] },
): Promise<Observed<Ack>> {
  const body = new URLSearchParams()
  for (const [index, shortcut] of options.shortcuts.entries()) {
    const key = shortcutKey(shortcut, index)
    body.set(`shortcut[${key}][name]`, shortcut.name)
    for (const [field, value] of Object.entries(addressParams(shortcut.target)))
      body.set(`shortcut[${key}][${field}]`, value)
    body.set(`shortcut[${key}][type]`, String(shortcut.target.type))
  }
  return routeAck(session, GAME_ROUTES.fleetStep1SaveShortcuts, {
    query: { ajax: 1 },
    method: 'POST',
    body,
  })
}

export function fleetStep1DeleteShortcuts(
  session: Session,
  options: { ids: readonly number[] },
): Promise<Observed<Ack>> {
  const body = new URLSearchParams()
  for (const id of options.ids) body.set(`shortcut[${id}][name]`, '')
  return routeAck(session, GAME_ROUTES.fleetStep1SaveShortcuts, {
    query: { ajax: 1 },
    method: 'POST',
    body,
  })
}
