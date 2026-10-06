import { ErrorCode } from '../types.ts'
import type { Coordinate, ElementMap } from '../types.ts'
import { coordinateIn } from './coordinates.ts'
import {
  ELEMENT_ICON_SELECTOR,
  RESOURCE_ICON_SELECTOR,
  imageId,
  requiredAttribute,
  selections,
  shipTableRows,
  textContent,
  withoutChildren,
} from './dom.ts'
import { FleetMission } from './missions.ts'
import { displayed, readAmount, readInteger } from './numbers.ts'
import { tooltipPage } from './page.ts'
import type { Page } from './page.ts'
import { OperationError } from './result.ts'
import type { StaticValue } from './script-data.ts'
import { object } from './script-data.ts'

export type FleetSlots = {
  used: number

  total: number
}

/**
 * Fleet and expedition slots; unreported pairs are null.
 *
 * 页面的舰队与探索槽位；未显示的槽位对为 null。
 */
export type FleetSlotPair = {
  fleetSlots: FleetSlots | null
  expeditionSlots: FleetSlots | null
}

/**
 * Unit exposed by an event; hidden IDs and quantities are null.
 *
 * 事件公开的单位；隐藏的 ID 与数量为 null。
 */
export type VisibleUnit = {
  elementId: number | null
  name: string
  amount: number | null
}

/**
 * Fleet event from the page; unknown mission, ownership and cargo remain null.
 *
 * 页面中的舰队事件；未知任务、归属及货物均保留为 null。
 */
export type FleetEvent = {
  /**
   * Event time in Unix milliseconds.
   *
   * 事件发生时间，Unix 毫秒。
   */
  occursAtMs: number

  /**
   * Remaining seconds at observation.
   *
   * 观测时的剩余秒数。
   */
  remainingSeconds: number

  state: 'flight' | 'return' | 'holding'
  mission: number | null

  missionText: string | null

  isOwn: boolean | null
  text: string

  /**
   * Coordinates follow event wording; their order changes on return.
   *
   * 坐标按事件文本顺序排列，返航时顺序会变化。
   */
  addresses: Coordinate[]
  units: VisibleUnit[] | null
  cargo: ElementMap | null
}

export function slots(page: Page): FleetSlotPair {
  const header = page.$('.gray_flettab > .transparent').last()
  const pairs = [
    ...header.text().matchAll(/([\d.]+(?:e[+-]?\d+)?)\s*\/\s*([\d.]+(?:e[+-]?\d+)?)/gi),
  ]
  const read = (index: number): FleetSlots | null =>
    pairs[index] ? { used: readAmount(pairs[index][1]), total: readAmount(pairs[index][2]) } : null
  return { fleetSlots: read(0), expeditionSlots: read(1) }
}

/**
 * Decode a static object into element IDs and nonnegative quantities.
 *
 * 将静态对象解码为元素 ID 与非负数量 Map。
 */
export function numericMap(value: StaticValue | undefined): ElementMap {
  return new Map(
    Object.entries(object(value)).map(([id, count]) => [readInteger(id, 1), readAmount(count)]),
  )
}

/**
 * Read unit tooltip rows; quantities are null when only names are disclosed.
 *
 * 读取单位提示表；仅公开名称时数量为 null。
 */
export function unitRows(page: Page): VisibleUnit[] {
  return shipTableRows(page.$('body')).flatMap(({ row, icon, count }, index): VisibleUnit[] => {
    const cells = row.children('td')
    if (!cells.length) return []
    if (count.length)
      return [
        {
          elementId: imageId(icon),
          name: textContent(withoutChildren(count.parent())).replace(/:$/, ''),
          amount: displayed(count.text()),
        },
      ]

    if (cells.length === 1 && index > 0)
      return [{ elementId: null, name: textContent(cells.eq(0)), amount: null }]
    return []
  })
}

/**
 * Server MissionCaseMIP uses mission 10 and the missile class.
 *
 * 服务端 MissionCaseMIP 使用任务 10 和 missile 样式。
 */
const MISSILE_MISSION = 10

const EVENT_MISSIONS: ReadonlyMap<string, number> = new Map([
  ['attack', FleetMission.Attack],
  ['federation', FleetMission.ACS],
  ['transport', FleetMission.Transport],
  ['deploy', FleetMission.Stay],
  ['hold', FleetMission.StayAlly],
  ['espionage', FleetMission.Spy],
  ['colony', FleetMission.Colonisation],
  ['harvest', FleetMission.Recycling],
  ['destroy', FleetMission.Destruction],
  ['missile', MISSILE_MISSION],
  ['expdm', FleetMission.FoundDM],
  ['expedit', FleetMission.Expedition],
  ['warexpedit', FleetMission.MilitaryExpedition],
])

function eventMission(classes: readonly string[]): { mission: number; isOwn: boolean } | null {
  for (const value of classes) {
    const mission = EVENT_MISSIONS.get(value.replace(/^own/, ''))
    if (mission !== undefined) return { mission, isOwn: value.startsWith('own') }
  }
  return null
}

/**
 * Read fleet events and unit/cargo tooltips in document order.
 *
 * 按文档顺序读取舰队事件及单位、货物提示。
 */
export function fleetEvents(page: Page): FleetEvent[] {
  return selections(page.$('.fleet_time [data-fleet-end-time]')).flatMap((timer) => {
    const states = timer
      .closest('.fleet_time')
      .next('.fleet_text')
      .find('span.flight, span.return, span.holding')
    if (!states.length) throw new OperationError(ErrorCode.ParseError, 'Missing fleet event state')
    return selections(states).map((stateNode) => {
      const classes = requiredAttribute(stateNode, 'class').split(/\s+/)
      const state = classes.includes('return')
        ? 'return'
        : classes.includes('holding')
          ? 'holding'
          : 'flight'
      const event = eventMission(classes)
      let units: VisibleUnit[] | null = null
      let cargo: ElementMap | null = null
      let missionText: string | null = null

      const tooltips = selections(stateNode.find('[data-tooltip-content]')).map((anchor) => ({
        anchor,
        tip: tooltipPage(page, anchor),
      }))
      const unitTips = tooltips.filter(
        ({ tip }) =>
          tip.$(ELEMENT_ICON_SELECTOR).length ||
          (tip.$('table.reducefleet_table').length && !tip.$(RESOURCE_ICON_SELECTOR).length),
      )
      const cargoTips = tooltips.filter(({ tip }) => tip.$(RESOURCE_ICON_SELECTOR).length)
      if (unitTips.length > 1)
        throw new OperationError(ErrorCode.ParseError, 'Ambiguous fleet unit tooltip')
      if (cargoTips.length > 1)
        throw new OperationError(ErrorCode.ParseError, 'Ambiguous fleet cargo tooltip')
      if (unitTips.length) {
        const visible = unitRows(unitTips[0]!.tip)
        units = visible.length ? visible : null
      }
      if (cargoTips.length) {
        missionText = textContent(cargoTips[0]!.anchor) || null
        cargo = new Map()

        for (const { icon, count } of shipTableRows(cargoTips[0]!.tip.$('body'))) {
          const id = imageId(icon)
          if (id !== null) cargo.set(id, displayed(count.text()))
        }
      }
      const addresses = selections(stateNode.find('a[href*="galaxy"]')).flatMap((link) => {
        const point = coordinateIn(link.text())
        return point ? [point] : []
      })
      if (missionText === null) {
        const lastAddress = stateNode.find('a[href*="galaxy"]').last()
        const siblings = lastAddress.parent().contents().toArray()
        const tail = lastAddress.length
          ? textContent(
              siblings
                .slice(siblings.indexOf(lastAddress.node()!) + 1)
                .map((child) => page.$(child).text())
                .join(' '),
            )
          : ''
        missionText = tail.match(/[:：]\s*([^:：]+)$/)?.[1]?.trim() || null
      }
      return {
        occursAtMs: readInteger(timer.attr('data-fleet-end-time')) * 1000,
        remainingSeconds: readAmount(timer.attr('data-fleet-time')),
        state,
        mission: event === null ? null : event.mission,
        missionText,
        isOwn: event === null ? null : event.isOwn,
        text: textContent(stateNode),
        addresses,
        units,
        cargo,
      }
    })
  })
}
