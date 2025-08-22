import { indexOfSlice } from '../../utils/indexOf'
import { Operator } from '../../operator'
import { numericalString } from '../../utils/numericalString'

export const parseBuildResearch = (
  operator: Operator,
  body: string,
  position: number,
  result: { failed: boolean; data: string },
) => {
  //遍历DatatList，获取每一对id和level，压入operator的elements
  position = indexOfSlice(body, position, result, 'DatatList		= ', ';')
  if (result.failed) return position
  let listPosition = 0
  const listBody = result.data
  while (true) {
    listPosition = indexOfSlice(listBody, listPosition, result, '"id":"', '"')
    if (result.failed) break
    const element = Number(result.data)

    listPosition = indexOfSlice(listBody, listPosition, result, '"level":"', '"')
    if (result.failed) break
    const count = numericalString(result.data)

    operator.elements.set(element, count)
  }

  //重置failed状态，因为循环结束后这个failed必定为true
  result.failed = false

  return position
}
