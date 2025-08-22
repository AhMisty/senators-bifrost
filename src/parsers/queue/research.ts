import { indexOfOrder, indexOfSlice } from '../../utils/indexOf'
import { Operator } from '../../operator'
import { numericalString } from '../../utils/numericalString'

export const parseQueueResearch = (
  operator: Operator,
  body: string,
  position: number,
  result: { failed: boolean; data: string },
) => {
  //清空原值
  operator.queues.research.clear()

  //跳转到内容块
  position = indexOfOrder(body, position, result, 'build_process"')
  if (result.failed) {
    //重置failed状态，因为没有队列是正常的
    result.failed = false
    return position
  }

  //获取最后一个空element_row的位置，防止越界
  const lastProcess = indexOfOrder(body, position, result, '"build_content')
  if (result.failed) return position

  while (true) {
    //获取element id
    position = indexOfSlice(body, position, result, 'gebaeude/', '.')
    if (result.failed || position > lastProcess) break
    const element = Number(result.data)

    //获取element count
    position = indexOfSlice(body, position, result, 'onlistremov ">', '<')
    if (result.failed || position > lastProcess) break

    operator.queues.research.push(element, numericalString(result.data))
  }

  //重置failed状态，因为循环结束后这个failed必定为true
  result.failed = false

  return position
}
