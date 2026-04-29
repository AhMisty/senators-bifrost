import { indexOfSlice } from '../utils/indexOf'

export const parseAllyContent = (
  body: string,
  position: number,
  result: { failed: boolean; data: string },
): number => {
  position = indexOfSlice(body, position, result, 'ally_contents">', '</div>')
  if (result.failed) return position

  return position
}
