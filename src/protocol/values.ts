import { ErrorCode } from '../types.ts'
import { readDecimal } from './numbers.ts'
import { OperationError } from './result.ts'

const FLEET_SPEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
export type FleetSpeed = (typeof FLEET_SPEEDS)[number]
export type ProductionStep = 0 | FleetSpeed
const PRODUCTION_STEPS: readonly ProductionStep[] = [0, ...FLEET_SPEEDS]
export const PRODUCTION_ELEMENT_IDS = [
  1, 2, 3, 4, 6, 12, 14, 15, 21, 31, 44, 81, 82, 83, 84, 212,
] as const
export type ProducerElementId = (typeof PRODUCTION_ELEMENT_IDS)[number]

/**
 * Decode a response number into an endpoint's fixed choices.
 *
 * 将响应中的数值解码为接口允许的固定选项。
 */
export function readChoice<Value extends number>(
  input: unknown,
  choices: readonly Value[],
  name: string,
): Value {
  const value = readDecimal(input)
  const choice = choices.find((item) => item === value)
  if (choice === undefined) throw new OperationError(ErrorCode.ParseError, `Unknown ${name}`)
  return choice
}

export function readFleetSpeed(input: unknown): FleetSpeed {
  return readChoice(input, FLEET_SPEEDS, 'fleet speed')
}

export function readProductionStep(input: unknown): ProductionStep {
  return readChoice(input, PRODUCTION_STEPS, 'production step')
}

export function readProducerId(input: unknown): ProducerElementId {
  return readChoice(input, PRODUCTION_ELEMENT_IDS, 'producer element')
}
