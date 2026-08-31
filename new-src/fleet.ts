// 舰队/导弹相关枚举与选项类型（数值为服务器协议值，不可随意更改）
import type { ElementMap } from './types'

export enum FleetMission {
  /** 攻击 */
  Attack = 1,
  /** 联盟 */
  Federation = 2,
  /** 运输 */
  Transport = 3,
  /** 部署 */
  Deploy = 4,
  /** 持留 */
  Hold = 5,
  /** 间谍 */
  Espionage = 6,
  /** 建立殖民地 */
  Colony = 7,
  /** 收集资源 */
  Harvest = 8,
  /** 摧毁 */
  Destroy = 9,
  /** 导弹 */
  Missile = 10,
  /** 侦察 */
  Expdm = 11,
  /** 探测 */
  Expedit = 15,
  /** 贸易 */
  Warexpedit = 18,
}

export enum FleetSpeed {
  One = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
  Ten = 10,
}

export enum FleetStaytime {
  One = 1,
}

export type FleetTarget = {
  galaxy: number
  system: number
  planet: number
  type: number
}

export type SendFleetOptions = {
  // 出发星球 id
  origin: number
  target: FleetTarget
  mission: FleetMission
  speed: FleetSpeed
  staytime: FleetStaytime
  metal: number
  crystal: number
  deuterium: number
  // 舰队编制：舰船元素 id → 数量
  ships: ElementMap
}

export type SendMissleOptions = {
  // 发射星球 id
  origin: number
  target: FleetTarget
  count: number
  // 目标优先级（首个拦截对象）
  firstTarget: number
}
