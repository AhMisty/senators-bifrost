import type { Ack, PageReply } from '../../protocol/ack.ts'
import { coordinateIn } from '../../protocol/coordinates.ts'
import type { Selection } from '../../protocol/dom.ts'
import { linkUrl, selections, tableRows, textContent, blockLines } from '../../protocol/dom.ts'
import { displayed, readAt, readInteger } from '../../protocol/numbers.ts'
import { observation, tooltipPage } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Coordinate, Observation } from '../../types.ts'

export type AdminFleetCargoLine = {
  name: string
  amount: number
}

export type AdminFleetParty = {
  player: { id: number | null; name: string }
  planet: { id: number | null; name: string; coordinate: Coordinate | null }
}

/**
 * Fleet in flight; times and mission names retain the server display format.
 *
 * 在途舰队；时间和任务名保留服务端显示格式。
 */
export type AdminFleetEntry = {
  id: number
  missionText: string

  /**
   * ACS group, or null for a fleet flying alone.
   *
   * 联合作战组；独立舰队为 null。
   */
  group: { id: number; name: string } | null
  departureAtText: string
  arrivalAtText: string
  returnAtText: string

  /**
   * Displayed hold end and duration in hours, or - when there is no hold.
   *
   * 停留结束时间及小时数的显示文本；无停留为 -。
   */
  holdText: string
  shipCount: number

  /**
   * Ship types and quantities from the count-cell tooltip.
   *
   * 舰船类型和数量，来自数量单元格的提示框。
   */
  ships: AdminFleetCargoLine[]

  /**
   * Carried resources from the mission-cell tooltip.
   *
   * 携带资源，来自任务单元格的提示框。
   */
  resources: AdminFleetCargoLine[]
  origin: AdminFleetParty
  target: AdminFleetParty

  /**
   * The fleet event is locked by a running instance or an administrator.
   *
   * 舰队事件被执行实例或管理员锁定。
   */
  locked: boolean

  /**
   * The fleet event record is missing.
   *
   * 舰队对应的事件记录缺失。
   */
  broken: boolean
}

export type AdminFlyingFleetPage = Observation & {
  kind: 'adminFlyingFleet'
  fleets: AdminFleetEntry[]
}

const PARTY_ID = /\(\s*ID:\s*\d+\s*\)/

const PARTY_COORDINATE = /\[[\d:]+\]/

const RANKED = /\s*\(R\)$/

const DEFENCE_MARKER = /\s*\(D\)$/

function partyId(text: string): number | null {
  const found = text.match(PARTY_ID)
  return found ? readInteger(found[0].replace(/\D/g, '')) : null
}

function partyName(text: string): string {
  return textContent(text.replace(PARTY_ID, '').replace(PARTY_COORDINATE, ''))
}

function tooltipLines(page: Page, cell: Selection): AdminFleetCargoLine[] {
  const anchor = cell.find('a')
  if (anchor.length === 0) return []
  const tooltip = tooltipPage(page, anchor)
  return selections(tooltip.$('table tr')).map((row) => {
    const cells = row.children('td')
    return {
      name: textContent(cells.eq(0)),
      amount: displayed(textContent(cells.eq(1))),
    }
  })
}

function missionCell(mission: Selection): Pick<AdminFleetEntry, 'missionText' | 'group'> {
  const lines = blockLines(mission.find('a'))
  return {
    missionText: readAt(lines, 0).replace(RANKED, ''),
    group:
      lines.length < 3 ? null : { id: readInteger(lines[1]), name: lines[2]!.replace(RANKED, '') },
  }
}

export function readAdminFlyingFleet(page: Page): AdminFlyingFleetPage {
  return {
    kind: 'adminFlyingFleet',
    ...observation(page),
    fleets: tableRows(page, 'table tbody tr').map((row) => {
      const cells = row.children('td')
      const mission = cells.eq(1)
      const named = missionCell(mission)
      const lock = linkUrl(page, cells.eq(11).find('a')).searchParams.get('lock')
      const origin = textContent(cells.eq(4))
      const originPlanet = textContent(cells.eq(5))
      const target = textContent(cells.eq(7))
      const targetPlanet = textContent(cells.eq(8))
      return {
        id: readInteger(textContent(cells.eq(0))),
        missionText: named.missionText,
        group: named.group,
        departureAtText: textContent(cells.eq(2)),
        arrivalAtText: textContent(cells.eq(6)),
        returnAtText: textContent(cells.eq(9)),
        holdText: textContent(cells.eq(10)),
        shipCount: displayed(textContent(cells.eq(3)).replace(DEFENCE_MARKER, '')),
        ships: tooltipLines(page, cells.eq(3)),
        resources: tooltipLines(page, mission),
        origin: {
          player: { id: partyId(origin), name: partyName(origin) },
          planet: {
            id: partyId(originPlanet),
            name: partyName(originPlanet),
            coordinate: coordinateIn(originPlanet),
          },
        },
        target: {
          player: { id: partyId(target), name: partyName(target) },
          planet: {
            id: partyId(targetPlanet),
            name: partyName(targetPlanet),
            coordinate: coordinateIn(targetPlanet),
          },
        },
        locked: lock === '0',
        broken: lock === '2',
      }
    }),
  }
}

export function adminFlyingFleet(
  session: Session,
): Promise<Observed<PageReply<AdminFlyingFleetPage>>> {
  return routePage(session, ADMIN_ROUTES.flyingFleet, {}, readAdminFlyingFleet)
}

/**
 * Set fleet_busy; nonzero values also lock the fleet event.
 *
 * 设置 fleet_busy；非零值同时锁定舰队事件。
 */
export function adminFlyingFleetSetBusy(
  session: Session,
  options: { fleetId: number; busy: 0 | 1 | 2 },
): Promise<Observed<Ack>> {
  return routeAck(session, ADMIN_ROUTES.flyingFleet, {
    query: {
      id: options.fleetId,
      lock: String(options.busy),
    },
  })
}
