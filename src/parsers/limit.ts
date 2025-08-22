import { Operator } from '../operator'
import { Planet } from '../planets'
import { indexOfOrder, indexOfSlice } from '../utils/indexOf'

export const parseLimit = (
  operator: Operator,
  planet: Planet,
  body: string,
  position: number,
  result: { failed: boolean; data: string },
) => {
  position = indexOfOrder(body, position, result, 'resourceTicker')
  if (result.failed) return position

  position = indexOfSlice(body, position, result, 'limit: [0, "', '"')
  if (result.failed) return position
  const limit901 = Number(result.data)
  operator.elements.add(951, limit901 - planet.elements.get(951))
  planet.elements.set(951, limit901)

  position = indexOfSlice(body, position, result, 'limit: [0, "', '"')
  if (result.failed) return position
  const limit902 = Number(result.data)
  operator.elements.add(952, limit902 - planet.elements.get(952))
  planet.elements.set(952, limit902)

  position = indexOfSlice(body, position, result, 'limit: [0, "', '"')
  if (result.failed) return position
  const limit903 = Number(result.data)
  operator.elements.add(953, limit903 - planet.elements.get(953))
  planet.elements.set(953, limit903)

  return position
}
