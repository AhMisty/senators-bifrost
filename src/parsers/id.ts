import { Operator } from '../operator'
import { indexOfSlice } from '../utils/indexOf'

export const parseId = (
  operator: Operator,
  body: string,
  position: number,
  result: { failed: boolean; data: string },
) => {
  position = indexOfSlice(body, position, result, 'Playercard(', ',')
  if (!result.failed) {
    operator.id = Number(result.data)
  }

  return position
}
