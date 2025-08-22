import { Operator } from '../../operator'
import { Planet } from '../../planets'
import { indexOfSlice } from '../../utils/indexOf'

export const parseQueueShipyard = (
  operator: Operator,
  planet: Planet,
  body: string,
  position: number,
  result: { failed: boolean; data: string },
) => {
  //清空原值
  planet.queues.shipyard.clear()

  //获取队列信息的数组字符串并反序列化，然后遍历压入shipyard的队列中
  position = indexOfSlice(body, position, result, 'Queue":', ',"')
  if (result.failed) {
    //重置failed状态，因为没有队列是正常的
    result.failed = false
    return position
  }
  try {
    const queues = JSON.parse(result.data)
    for (const queue of queues) {
      planet.queues.shipyard.push(queue[3], queue[1])
    }
  } catch {
    result.failed = true
  }

  return position
}
