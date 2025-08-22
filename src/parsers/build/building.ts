import { indexOfOrder, indexOfSlice } from '../../utils/indexOf'
import { Operator } from '../../operator'
import { Planet } from '../../planets'
import { numericalString } from '../../utils/numericalString'

export const parseBuildBuilding = (
  operator: Operator,
  planet: Planet,
  body: string,
  position: number,
  result: { failed: boolean; data: string },
) => {
  while (true) {
    //定位到内容块
    position = indexOfOrder(body, position, result, 'btn_build_border"', 'value="')
    if (result.failed) break

    //获取element id
    position = indexOfSlice(body, position, result, 'value="', '"')
    if (result.failed) break
    const element = numericalString(result.data)

    //获取element count
    position = indexOfSlice(body, position, result, 'value="', '"')
    if (result.failed) break
    const count = numericalString(result.data)

    //压入elements
    operator.elements.add(element, count - planet.elements.get(element))
    planet.elements.set(element, count)
  }

  //重置failed状态，因为循环结束后这个failed必定为true
  result.failed = false

  return position
}
