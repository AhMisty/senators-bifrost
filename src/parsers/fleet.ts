import { Fleet } from '../fleet'
import { indexOfSlice } from '../utils/indexOf'

export const parseFleetToken = (
  fleet: Fleet,
  body: string,
  position: number,
  result: { failed: boolean; data: string },
) => {
  position = indexOfSlice(body, position, result, 'token" value="', '"')
  if (result.failed) return position
  fleet.token = result.data

  return position
}

export const parseFleetAllyContent = (
  fleet: Fleet,
  body: string,
  position: number,
  result: { failed: boolean; data: string },
) => {
  position = indexOfSlice(body, position, result, 'ally_contents">', '</div>')
  if (result.failed) return position

  return position
}
