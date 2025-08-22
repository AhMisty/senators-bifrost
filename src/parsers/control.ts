import { numericalString } from '../utils/numericalString'
import { Operator } from '../operator'
import { PlanetType } from '../planets'
import { indexOfOrder, indexOfSlice } from '../utils/indexOf'

export const parseControl = (
  operator: Operator,
  body: string,
  position: number,
  result: { failed: boolean; data: string },
) => {
  //定位到内容块
  position = indexOfOrder(body, position, result, '"ally_content"')
  if (result.failed) return position

  //获取所有element id，并写入到elements数组中
  const elements: number[] = []
  for (let index = 0; index < 161; index++) {
    position = indexOfSlice(body, position, result, 'gebaeude/', '.')
    if (result.failed) return position
    elements.push(Number(result.data))
  }

  //其中"每小时资源产出"这个element用的也是资源的图标id，不修改的话会导致覆盖掉对应资源的值
  elements[9] = 931
  elements[10] = 932
  elements[11] = 933

  //跳转到总计内容块
  position = indexOfOrder(body, position, result, '"sigma"')
  if (result.failed) return position

  //设置总量
  for (let index = 0; index < 161; index++) {
    position = indexOfSlice(body, position, result, 'block_td">', '<')
    if (result.failed) return position
    operator.elements.set(elements[index], numericalString(result.data))
  }

  //初始化planet的id白名单，用于在遍历完planet后清除不存在的planet
  const planetWhiteList = new Set<number>()
  //准备option容器
  const planetOption = {
    type: PlanetType.Planet,
    id: 0,
    name: '',
    coordinateString: '',
    used: 0,
    size: 0,
  }
  //遍历planet
  while (true) {
    //定位到planet
    position = indexOfOrder(body, position, result, '"imper_f')
    if (result.failed) break

    //获取planet的类型
    position = indexOfSlice(body, position, result, 'imper_', ' ')
    if (result.failed) break
    if (result.data === 'moon') {
      planetOption.type = PlanetType.Moon
    } else {
      planetOption.type = PlanetType.Planet
    }

    //获取planet的id
    position = indexOfSlice(body, position, result, 'overview&amp;cp=', '"')
    if (result.failed) break
    planetOption.id = Number(result.data)

    //获取planet的name
    position = indexOfSlice(body, position, result, '>', '<')
    if (result.failed) break
    planetOption.name = result.data

    //获取planet的坐标字符串
    position = indexOfSlice(body, position, result, '[', ']')
    if (result.failed) break
    planetOption.coordinateString = result.data

    //获取planet已经被使用了的面积
    position = indexOfSlice(body, position, result, 'text">', '/')
    if (result.failed) break
    planetOption.used = numericalString(result.data)

    //获取planet的总面积
    position = indexOfSlice(body, position, result, ' ', ' ')
    if (result.failed) break
    planetOption.size = numericalString(result.data)

    //设置planet的参数
    const planet = operator.planets.set(
      planetOption.id,
      planetOption.type,
      planetOption.name,
      planetOption.size,
      planetOption.used,
      planetOption.coordinateString,
    )

    //遍历设置planet的element
    for (let index = 0; index < 161; index++) {
      position = indexOfSlice(body, position, result, 'block_td">', '<')
      if (result.failed) break
      planet.elements.set(elements[index], numericalString(result.data))
    }

    //将planet的id添加到白名单
    planetWhiteList.add(planet.id)
  }

  if (!planetWhiteList.size) return position

  //清理不在白名单中的planet
  for (const planet of operator.planets.map.values()) {
    if (planetWhiteList.has(planet.id)) continue
    operator.planets.map.delete(planet.id)
  }

  //重置failed状态，因为循环结束后这个failed必定为true
  result.failed = false

  return position
}
