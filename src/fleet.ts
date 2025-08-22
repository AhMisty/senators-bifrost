import { Elements } from './elements'

const enum FleetMission {
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

const enum FleetSpeed {
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

const enum FleetStaytime {
  One = 1,
}

export type FleetOptions = {
  cp: number
  galaxy: number
  system: number
  planet: number
  type: number
  mission: FleetMission
  speed: FleetSpeed
  staytime: FleetStaytime
  metal: number
  crystal: number
  deuterium: number
  ships: Elements
  token?: string
}

export class Fleet {
  public cp: number
  public galaxy: number
  public system: number
  public planet: number
  public type: number
  public mission: FleetMission
  public speed: FleetSpeed
  public staytime: FleetStaytime
  public metal: number
  public crystal: number
  public deuterium: number
  public ships: Elements
  public token: string
  constructor(options: FleetOptions) {
    this.cp = options.cp
    this.galaxy = options.galaxy
    this.system = options.system
    this.planet = options.planet
    this.type = options.type
    this.mission = options.mission
    this.speed = options.speed
    this.staytime = options.staytime
    this.metal = options.metal
    this.crystal = options.crystal
    this.deuterium = options.deuterium
    this.ships = options.ships
    this.token = options.token || ''
  }
}
