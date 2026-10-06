import { readChoice } from './values.ts'

/**
 * New-Star dispatch mission IDs shared by requests and event readers.
 *
 * New-Star 派遣任务编号，同时用于请求与事件读取。
 */
export const FleetMission = {
  Attack: 1,

  /**
   * Launch a joint attack using the fleet group ID.
   *
   * 使用舰队组合编号发起联合攻击。
   */
  ACS: 2,

  Transport: 3,

  /**
   * Deploy the fleet at the target.
   *
   * 将舰队部署到目标。
   */
  Stay: 4,

  /**
   * Hold at an allied target.
   *
   * 在盟友目标驻留。
   */
  StayAlly: 5,

  Spy: 6,

  Colonisation: 7,

  Recycling: 8,

  Destruction: 9,

  /**
   * Dark-matter investigation; the event class is expdm.
   *
   * 暗物质探索；事件样式名为 expdm。
   */
  FoundDM: 11,

  Expedition: 15,

  /**
   * Nebula expedition uses mission 18; sector count is sent separately as sectors.
   *
   * 星云探索任务为 18，区域数量通过独立的 sectors 字段发送。
   */
  MilitaryExpedition: 18,
} as const

export type FleetMission = (typeof FleetMission)[keyof typeof FleetMission]

const MISSION_IDS: FleetMission[] = Object.values(FleetMission)

export function readFleetMission(value: unknown): FleetMission {
  return readChoice(value, MISSION_IDS, 'fleet mission')
}
