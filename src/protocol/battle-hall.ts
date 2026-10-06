import { ErrorCode } from '../types.ts'
import { requiredAttribute, textContent } from './dom.ts'
import type { Selection } from './dom.ts'
import { OperationError } from './result.ts'

const DRAW_SEPARATOR = ' VS '

/**
 * Combatants and the winner indicated by color; a plain-text VS separator denotes a draw.
 *
 * 双方名称及颜色标识的胜方；纯文本 VS 分隔表示平局。
 */
export type BattleSides = {
  attacker: string
  defender: string

  winner: 'attacker' | 'defender' | 'draw'
}

/**
 * Battle hall entry; ranks start at 1 and units counts losses on both sides.
 *
 * 战报大厅条目；排名从 1 开始，units 为双方总损失。
 */
export type BattleListing = BattleSides & {
  rank: number

  occurredAtText: string

  units: number
}

/**
 * Game and public halls use different separators; read the first and last combatants.
 *
 * 游戏与公开大厅的分隔标记不同，双方取首尾名称。
 */
export function combatants(cell: Selection): BattleSides {
  const spans = cell.find('span').toArray()
  if (spans.length < 2) {
    const text = textContent(cell)
    const separator = text.indexOf(DRAW_SEPARATOR)
    if (separator < 0) throw new OperationError(ErrorCode.ParseError, 'Missing battle sides')
    return {
      attacker: text.slice(0, separator),
      defender: text.slice(separator + DRAW_SEPARATOR.length),
      winner: 'draw',
    }
  }
  const first = cell.find('span').eq(0)
  const last = cell.find('span').eq(spans.length - 1)
  return {
    attacker: textContent(first),
    defender: textContent(last),
    winner: /00ff00/i.test(requiredAttribute(first, 'style')) ? 'attacker' : 'defender',
  }
}
