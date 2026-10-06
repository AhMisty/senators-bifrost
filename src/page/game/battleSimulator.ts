import type { Ack, PageReply } from '../../protocol/ack.ts'
import { TICKER_RESOURCES } from '../../protocol/context.ts'
import { prefixedId, requiredAttribute, selections } from '../../protocol/dom.ts'
import { elementFields } from '../../protocol/elements.ts'
import { readInteger } from '../../protocol/numbers.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type {
  ElementInput,
  PlanetObservation,
  PlanetReference,
  ResourceInput,
} from '../../types.ts'
import { ErrorCode } from '../../types.ts'

/**
 * Slot controls for each side; only the first defender slot lists defenses.
 *
 * 每个参战方的槽位控件；只有首个防守槽位列出防御设施。
 */
export type BattleSimulatorSlot = {
  index: number

  attackers: number[]

  defenders: number[]
}

export type BattleSimulatorPage = PlanetObservation & {
  kind: 'battleSimulator'

  bonusIds: number[]

  slots: BattleSimulatorSlot[]
}

export type BattleParticipantInput = { units: ElementInput; bonuses?: ElementInput }

export function readBattleSimulator(page: Page): BattleSimulatorPage {
  page.one('#tabs-0')
  const bonusIds = new Set<number>()
  const slots = selections(page.$('[id^="tabs-"]')).map((slot) => {
    const index = prefixedId(requiredAttribute(slot, 'id'), 'tabs-')
    const bonuses = new Set(slot.find('.rexx14 input').toArray())
    const attackers: number[] = []
    const defenders: number[] = []
    for (const input of slot.find('input[name^="battleinput["]').toArray()) {
      const field = page
        .$(input)
        .attr('name')
        ?.match(/^battleinput\[(\d+)\]\[([01])\]\[(\d+)\]$/)
      if (!field || readInteger(field[1]) !== index)
        throw new OperationError(ErrorCode.ParseError, 'Invalid battle simulator field')
      const id = readInteger(field[3], 1)
      if (bonuses.has(input)) bonusIds.add(id)
      else (field[2] === '0' ? attackers : defenders).push(id)
    }
    return { index, attackers, defenders }
  })
  return {
    kind: 'battleSimulator',
    ...planetObservation(page),
    bonusIds: [...bonusIds],
    slots,
  }
}

export function battleSimulator(
  session: Session,
  options: PlanetReference & { slots?: number },
): Promise<Observed<PlanetData<PageReply<BattleSimulatorPage>>>> {
  return routePage(
    session,
    GAME_ROUTES.battleSimulator,
    { planetId: options.planetId, query: { slots: options.slots ?? 1 } },
    readBattleSimulator,
  )
}

/**
 * Generate and store a simulated battle report; omitted catalogue bonuses are zero.
 *
 * 生成并保存模拟战报；加成目录中未提供的加成为零。
 *
 * @returns A JSON receipt containing the report ID on success.
 *
 * 成功时返回包含战报 ID 的 JSON 回执。
 */
export function battleSimulatorSend(
  session: Session,
  options: {
    catalog: Pick<BattleSimulatorPage, 'bonusIds'>
    attackers: readonly BattleParticipantInput[]
    defenders: readonly BattleParticipantInput[]
    resources?: ResourceInput
  },
): Promise<Observed<Ack>> {
  const body = new URLSearchParams()
  for (const [side, groups] of [
    [0, options.attackers],
    [1, options.defenders],
  ] as const) {
    for (const [slot, group] of groups.entries()) {
      for (const id of options.catalog.bonusIds)
        body.set(`battleinput[${slot}][${side}][${id}]`, '0')
      const inputs = group.bonuses === undefined ? [group.units] : [group.units, group.bonuses]
      for (const input of inputs)
        for (const field of elementFields(input, `battleinput[${slot}][${side}][`, ']'))
          body.set(...field)
    }
  }
  for (const { id, name } of TICKER_RESOURCES)
    body.set(`battleinput[0][1][${id}]`, String(options.resources?.[name] ?? 0))
  return routeAck(session, GAME_ROUTES.battleSimulatorSend, {
    method: 'POST',
    body,
  })
}
