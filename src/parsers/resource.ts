import { numericalString } from '../utils/numericalString'
import { Operator } from '../operator'
import { indexOfSlice } from '../utils/indexOf'

export const parseResource = (
  operator: Operator,
  body: string,
  position: number,
  result: { failed: boolean; data: string },
) => {
  position = indexOfSlice(body, position, result, 'darkmatter" name="', '"')
  if (result.failed) return position
  operator.elements.set(921, numericalString(result.data))

  position = indexOfSlice(body, position, result, 'antimatter" name="', '"')
  if (result.failed) return position
  operator.elements.set(922, numericalString(result.data))

  position = indexOfSlice(body, position, result, 'stardust" name="', '"')
  if (result.failed) return position
  operator.elements.set(923, numericalString(result.data))

  position = indexOfSlice(body, position, result, 'container" name="', '"')
  if (result.failed) return position
  operator.elements.set(924, numericalString(result.data))

  return position
}
