import { Operator } from '../operator'
import { Planet } from '../planets'
import { indexOfSlice } from '../utils/indexOf'
import { numericalString } from '../utils/numericalString'

export const parseEnergy = (
  operator: Operator,
  planet: Planet,
  body: string,
  position: number,
  result: { failed: boolean; data: string },
) => {
  position = indexOfSlice(body, position, result, 'current_energy" name="', '"')
  if (result.failed) return position
  const count = numericalString(result.data)

  operator.elements.add(941, count - planet.elements.get(941))
  planet.elements.set(941, count)

  return position
}
