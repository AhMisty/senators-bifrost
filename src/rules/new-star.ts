import type { FleetSpeed } from '../protocol/values.ts'
import type { Coordinate } from '../types.ts'

const SMALL_CARGO_ID = 202
const BOMBER_ID = 211

/**
 * Gross supply and independent consumption; retaining consumption avoids losing demand through large-number subtraction.
 *
 * 总供给和独立消耗；保留消耗值以避免大数相减丢失生产需求。
 */
export type SupplyBalance = {
  total: number
  /**
   * Nonnegative demand, the magnitude of the server's negative *_used value.
   *
   * 非负消耗量；对应服务端带负号的 *_used 的绝对值。
   */
  consumption: number
}

/**
 * Reproduce server PHP integer rounding: preround magnitudes in [1, 1e14) to 15 significant digits and retain values at or above 1e15.
 *
 * 复现服务端 PHP 的零位舍入；绝对值在 [1, 1e14) 时先保留 15 位有效数字，达到 1e15 时保留原值。
 */
function serverRound(value: number): number {
  let magnitude = Math.abs(value)
  if (magnitude >= 1e15) return value
  if (magnitude >= 1 && magnitude < 1e14) {
    const scale = 10 ** (14 - Math.floor(Math.log10(magnitude)))
    magnitude = Math.floor(magnitude * scale + 0.5) / scale
  }
  return Math.sign(value) * Math.floor(magnitude + 0.5)
}

/**
 * Per-ship speed and consumption include account drives and bonuses.
 *
 * 单位舰船速度和油耗已包含账号引擎及加成。
 */
export type FlightShip = { amount: number; speed: number; consumption: number }

/**
 * New-Star coordinate distance; identical coordinates have distance 5.
 *
 * New-Star 坐标距离；相同坐标的距离为 5。
 */
export function calculateFleetDistance(origin: Coordinate, target: Coordinate): number {
  if (origin.galaxy !== target.galaxy) return Math.abs(origin.galaxy - target.galaxy) * 20_000
  if (origin.system !== target.system) return Math.abs(origin.system - target.system) * 95 + 2_700
  if (origin.planet !== target.planet) return Math.abs(origin.planet - target.planet) * 5 + 1_000
  return 5
}

/**
 * Calculate one flight leg from the selected speed and universe multiplier.
 *
 * 按速度档位与宇宙倍率计算单程飞行时长。
 *
 * @returns Unrounded seconds, bounded below by minimumFleetSeconds.
 *
 * 未取整的秒数，最低为 minimumFleetSeconds。
 */
export function calculateFleetDuration(input: {
  distance: number
  slowestShipSpeed: number
  selectedSpeed: FleetSpeed
  fleetSpeedFactor: number
  minimumFleetSeconds: number
}): number {
  const duration =
    ((3500 / (input.selectedSpeed * 0.1)) *
      Math.sqrt((input.distance * 10) / input.slowestShipSpeed) +
      10) /
    input.fleetSpeedFactor
  return Math.max(duration, input.minimumFleetSeconds)
}

/**
 * Calculate deuterium consumption from distance, duration and individual ship characteristics.
 *
 * 根据舰队距离、时长及各舰船参数计算重氢消耗。
 *
 * @returns Total deuterium rounded by server rules, plus one.
 *
 * 按服务端规则舍入后加一的重氢总量。
 */
export function calculateFleetFuel(input: {
  distance: number
  durationSeconds: number
  fleetSpeedFactor: number
  ships: readonly FlightShip[]
}): number {
  let consumption = 0
  for (const ship of input.ships) {
    const speed =
      (35000 / Math.max(input.durationSeconds * input.fleetSpeedFactor - 10, 1)) *
      Math.sqrt((input.distance * 10) / ship.speed)
    const speedFactor = speed / 10 + 1
    consumption +=
      ((ship.consumption * ship.amount * input.distance) / 35000) * speedFactor * speedFactor
  }
  return serverRound(consumption) + 1
}

export type ShipDrive = 'combustion' | 'impulse' | 'hyperspace'

/**
 * Calculate ship speed using drive-switch rules and account bonus fractions, such as 0.1 for 10%.
 *
 * 按引擎切换规则和账号加成计算舰船速度；加成使用比例，如 0.1 表示 10%。
 *
 * @param input.driveCode - 1 combustion, 2 impulse, 3 hyperspace; 4 switches at impulse 5, and 5 switches at hyperspace 8.
 *
 * 1 燃烧、2 脉冲、3 超空间；4 在脉冲 5 级切换，5 在超空间 8 级切换。
 */
export function calculateShipSpeed(input: {
  baseSpeed: number
  driveCode: 1 | 2 | 3 | 4 | 5
  impulseLevel: number
  hyperspaceLevel: number
  driveBonuses: Record<ShipDrive, number>
  generalBonus: number
}): { drive: ShipDrive; speed: number } {
  const drive: ShipDrive =
    input.driveCode === 1
      ? 'combustion'
      : input.driveCode === 2
        ? 'impulse'
        : input.driveCode === 3
          ? 'hyperspace'
          : input.driveCode === 4
            ? input.impulseLevel >= 5
              ? 'impulse'
              : 'combustion'
            : input.hyperspaceLevel >= 8
              ? 'hyperspace'
              : 'impulse'
  const speed = input.baseSpeed * (1 + input.driveBonuses[drive] + input.generalBonus)
  return { drive, speed: speed }
}

/**
 * Use alternate consumption for small cargo at impulse 5 and bombers at hyperspace 8.
 *
 * 小型运输舰在脉冲等级 5、轰炸机在超空间等级 8 时使用替代油耗。
 *
 * @param input.fuelConsumptionFactor - Account fuel factor expressed as a fraction, such as 0.1 for 10%.
 *
 * 账号燃料系数，使用比例，如 0.1 表示 10%。
 *
 * @returns Unrounded consumption parameter for one ship.
 *
 * 单位舰船的油耗参数，未取整。
 */
export function calculateShipConsumption(input: {
  elementId: number
  baseConsumption: number
  alternateConsumption: number
  impulseLevel: number
  hyperspaceLevel: number
  fuelConsumptionFactor: number
}): number {
  const alternate =
    (input.elementId === SMALL_CARGO_ID && input.impulseLevel >= 5) ||
    (input.elementId === BOMBER_ID && input.hyperspaceLevel >= 8)
  const base = alternate ? input.alternateConsumption : input.baseConsumption
  return base + base * 0.99 ** (input.fuelConsumptionFactor * 100)
}

/**
 * Calculate missile flight time from system distance and the universe fleet multiplier.
 *
 * 根据恒星系距离和宇宙舰队倍率计算星际导弹时长。
 *
 * @returns Seconds rounded by server rules and bounded below by minimumFleetSeconds.
 *
 * 按服务端规则舍入的秒数，最低为 minimumFleetSeconds。
 */
export function calculateMissileDuration(input: {
  originSystem: number
  targetSystem: number
  fleetSpeedFactor: number
  minimumFleetSeconds: number
}): number {
  const distance = Math.abs(input.originSystem - input.targetSystem)
  return Math.max(
    serverRound((30 + 60 * distance) / input.fleetSpeedFactor),
    input.minimumFleetSeconds,
  )
}

/**
 * Round gross generation after speed and bonus; scale consumption without rounding.
 *
 * 总供给乘速度及加成后舍入，消耗只乘速度而不舍入。
 *
 * @param input.bonus - Supply bonus fraction, such as 0.1 for 10%.
 *
 * 供给加成比例，如 0.1 表示 10%。
 */
export function calculateSupplyBalance(input: {
  generation: number
  consumption: number
  speed: number
  bonus: number
}): SupplyBalance {
  const total = serverRound(input.generation * input.speed * (1 + input.bonus))

  return { total, consumption: input.consumption * input.speed }
}

/**
 * Apply supply limits and resource bonuses; genericBonus and resourceBonus are fractions.
 *
 * 应用供给限制与资源加成；genericBonus 和 resourceBonus 使用比例。
 *
 * @returns Net hourly output excluding basic income; zero when supply demand is zero.
 *
 * 不含基础收入的每小时净产量；供给需求为零时返回零。
 */
export function calculateResourceProduction(input: {
  generation: number
  consumption: number

  /**
   * Supply selected by the universe resglobal_stop_product setting.
   *
   * 宇宙 resglobal_stop_product 设置选定的供给。
   */
  supply: SupplyBalance
  genericBonus: number
  resourceBonus: number
  resourceMultiplier: number
}): number {
  const used = input.supply.consumption

  if (used === 0) return 0
  const operatingFraction = Math.min(1, input.supply.total / used)
  return (
    (input.generation * (1 + input.genericBonus + input.resourceBonus) * operatingFraction -
      input.consumption) *
    input.resourceMultiplier
  )
}

/**
 * Price for the next level after completedLevel; dismantling halves the discounted price.
 *
 * completedLevel 之后一级的价格；拆除价格为折扣后价格的一半。
 *
 * @param input.costReduction - Cost reduction fraction, such as 0.1 for a 10% discount.
 *
 * 成本减免比例，如 0.1 表示减免 10%。
 *
 * @returns Unrounded costs by resource ID, omitting resources whose discounted cost is zero.
 *
 * 按资源 ID 索引的未取整成本；折扣后为零的资源省略。
 */
export function calculateLevelPrice(input: {
  baseCosts: ReadonlyMap<number, number>
  factor: number
  completedLevel: number
  costReduction: number

  dismantling?: boolean
}): Map<number, number> {
  const share = input.dismantling ? 0.5 : 1
  const costs = new Map<number, number>()
  for (const [resourceId, base] of input.baseCosts) {
    const discounted = base - base * input.costReduction
    if (discounted === 0) continue
    const price =
      input.factor === 0 || input.factor === 1
        ? discounted
        : discounted * input.factor ** input.completedLevel
    costs.set(resourceId, price * share)
  }
  return costs
}

/**
 * Calculate construction time from discounted costs and effective facility speed.
 *
 * 按折扣后成本和有效设施速度计算建造时长。
 *
 * @returns Unrounded seconds for ships, defenses and missiles; buildings and research are floored and bounded below by minimumBuildSeconds.
 *
 * 舰船、防御及导弹返回未取整秒数；建筑与研究向下取整，最低为 minimumBuildSeconds。
 */
export function calculateConstructionSeconds(input: {
  category: 'building' | 'research' | 'ship' | 'defense' | 'missile'
  costs: ReadonlyMap<number, number>
  speedResourceIds: readonly number[]
  gameSpeed: number

  /**
   * Effective speed-resource level, including bonuses and the eligible research network where applicable.
   *
   * 有效速度资源等级，包含加成及适用时满足条件的研究网络。
   */
  speedResourceLevel: number
  minimumBuildSeconds: number

  dismantling?: boolean
}): number {
  let elementCost = 0
  for (const resourceId of input.speedResourceIds) {
    const amount = input.costs.get(resourceId)
    if (amount === undefined) continue
    elementCost += amount ** 0.3 / 0.003
  }
  const time =
    input.category === 'research'
      ? elementCost / (100 * (1 + input.speedResourceLevel)) / (input.gameSpeed / 2500)
      : elementCost / (input.gameSpeed * (1 + input.speedResourceLevel))
  if (input.category === 'ship' || input.category === 'defense' || input.category === 'missile')
    return time * 3600

  return Math.max(Math.floor(time * (input.dismantling ? 1300 : 3600)), input.minimumBuildSeconds)
}
