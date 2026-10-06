import type { SupplyResourceId } from '../protocol/context.ts'
import type { ProducerElementId, ProductionStep } from '../protocol/values.ts'
import { calculateSupplyBalance, calculateResourceProduction } from './new-star.ts'
import type { SupplyBalance } from './new-star.ts'
export type { ProducerElementId } from '../protocol/values.ts'

const STOCK_IDS: readonly number[] = [901, 902, 903]

/**
 * Producer level and stored production step; steps range from 0 to 10.
 *
 * 生产设施等级及存储的生产档位；档位范围为 0–10。
 */
export type ResourceProducer = { elementId: ProducerElementId; level: number; step: ProductionStep }

/**
 * Calculate default New-Star production formulas in the order of the server's stored expressions.
 *
 * 计算 New-Star 默认生产公式，运算顺序遵循服务端存储的表达式。
 *
 * @param maximumTemperature - Maximum planet temperature in degrees Celsius.
 *
 * 星球最高温度，单位为摄氏度。
 *
 * @returns Base flow by resource ID; positive production and negative consumption before speed and bonuses.
 *
 * 按资源 ID 索引的基础流量；正数生产、负数消耗，未计速度与加成。
 */
export function calculateProducerFlow(
  producer: ResourceProducer,
  maximumTemperature: number,
): Map<number, number> {
  const level = producer.level
  const share = producer.step * 0.1
  const tenPercentGrowth = 1.1 ** level
  const deuteriumTemperature = -0.002 * maximumTemperature + 1.28
  const linear = (base: number): number => base * level * share
  let entries: [number, number][]
  switch (producer.elementId) {
    case 1:
      entries = [
        [901, 30 * level * tenPercentGrowth * share],
        [911, -10 * level * tenPercentGrowth * share],
      ]
      break
    case 2:
      entries = [
        [902, 20 * level * tenPercentGrowth * share],
        [911, -10 * level * tenPercentGrowth * share],
      ]
      break
    case 3:
      entries = [
        [903, 10 * level * tenPercentGrowth * deuteriumTemperature * share],
        [911, -30 * level * tenPercentGrowth * share],
      ]
      break
    case 4:
      entries = [[911, 20 * level * tenPercentGrowth * share]]
      break
    case 6:
      entries = [[913, linear(50)]]
      break
    case 12:
      entries = [
        [903, -10 * level * tenPercentGrowth * share],
        [911, 30 * level * 1.05 ** level * share],
      ]
      break
    case 14:
      entries = [
        [912, linear(10) + 10],
        [914, linear(10)],
        [915, linear(10)],
      ]
      break
    case 15:
      entries = [
        [912, linear(50)],
        [914, linear(50)],
        [915, linear(50)],
      ]
      break
    case 21:
      entries = [
        [914, linear(10)],
        [915, linear(20)],
      ]
      break
    case 31:
      entries = [[913, linear(15)]]
      break
    case 44:
      entries = [[916, linear(10)]]
      break
    case 81:
      entries = [
        [901, 300 * level * tenPercentGrowth * share],
        [902, 200 * level * tenPercentGrowth * share],
        [903, 100 * level * tenPercentGrowth * deuteriumTemperature * share],
      ]
      break
    case 82:
      entries = [
        [912, linear(10)],
        [915, linear(10)],
      ]
      break
    case 83:
      entries = [
        [914, linear(10)],
        [916, linear(10)],
      ]
      break
    case 84:
      entries = [
        [913, linear(10)],
        [916, linear(10)],
      ]
      break
    case 212:
      entries = [[911, ((maximumTemperature + 160) / 6) * share * level]]
      break
  }
  return new Map(entries)
}

/**
 * Reproduce the default producer grid, adding basic income after supply limits; bonus fields are fractions.
 *
 * 复现默认生产网格，供给限制计算完成后再加入基础收入；各 bonus 字段使用比例。
 *
 * @param input.maximumTemperature - Maximum planet temperature in degrees Celsius.
 *
 * 星球最高温度，单位为摄氏度。
 *
 * @returns Net hourly metal, crystal and deuterium output, with totals and consumption for all six supply types.
 *
 * 金属、晶体、重氢的每小时净产量，以及六类供给的总量与消耗。
 */
export function calculatePlanetProduction(input: {
  /**
   * Use the server catalogue order, including level-zero producers; robotics contributes supply even at level zero.
   *
   * 按服务端目录顺序提供，包含零级设施；机器人厂即使零级也提供供给。
   */
  producers: readonly ResourceProducer[]

  /**
   * Current stocks; omitted balances are zero.
   *
   * 当前库存；未提供的库存按零计算。
   */
  stocks: ReadonlyMap<number, number>

  productionSupplyId: SupplyResourceId
  maximumTemperature: number
  energySpeed: number
  resourceMultiplier: number

  /**
   * Base hourly income before the resource multiplier; zero for body types listed in reslist_planet_no_basic.
   *
   * 该天体未乘资源倍率的基础小时收入；reslist_planet_no_basic 中列出的类型应为零。
   */
  basicIncome: ReadonlyMap<number, number>
  genericResourceBonus: number
  resourceBonuses: ReadonlyMap<number, number>
  supplyBonuses: ReadonlyMap<number, number>
}): {
  resourcesPerHour: Map<number, number>
  supplies: Map<number, SupplyBalance>
} {
  const positive = new Map<number, number>()
  const negative = new Map<number, number>()
  for (const producer of input.producers)
    for (const [resourceId, value] of calculateProducerFlow(producer, input.maximumTemperature)) {
      /**
       * New-Star ignores stock-resource consumption while that stock is exactly zero.
       *
       * New-Star 在库存恰为零时忽略该库存资源的消耗。
       */
      if (value < 0 && STOCK_IDS.includes(resourceId) && (input.stocks.get(resourceId) ?? 0) === 0)
        continue
      const target = value >= 0 ? positive : negative
      target.set(resourceId, (target.get(resourceId) ?? 0) + Math.abs(value))
    }
  const supplies = new Map<number, SupplyBalance>()
  const balance = (resourceId: number): SupplyBalance =>
    calculateSupplyBalance({
      generation: positive.get(resourceId) ?? 0,
      consumption: negative.get(resourceId) ?? 0,
      speed: input.energySpeed,
      bonus: input.supplyBonuses.get(resourceId) ?? 0,
    })
  const productionSupply = balance(input.productionSupplyId)
  for (const resourceId of [911, 912, 913, 914, 915, 916])
    supplies.set(
      resourceId,
      resourceId === input.productionSupplyId ? productionSupply : balance(resourceId),
    )
  const resourcesPerHour = new Map<number, number>()
  for (const resourceId of STOCK_IDS)
    resourcesPerHour.set(
      resourceId,
      calculateResourceProduction({
        generation: positive.get(resourceId) ?? 0,
        consumption: negative.get(resourceId) ?? 0,
        supply: productionSupply,
        genericBonus: input.genericResourceBonus,
        resourceBonus: input.resourceBonuses.get(resourceId) ?? 0,
        resourceMultiplier: input.resourceMultiplier,
      }) +
        (input.basicIncome.get(resourceId) ?? 0) * input.resourceMultiplier,
    )
  return { resourcesPerHour, supplies }
}
