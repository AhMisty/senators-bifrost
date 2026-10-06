import assert from 'node:assert/strict'
import { test } from 'node:test'

import { calculatePlanetProduction, calculateProducerFlow } from '../../src/index.ts'
import type { ProducerElementId } from '../../src/index.ts'

type ProductionInput = Parameters<typeof calculatePlanetProduction>[0]

void test('producer flows keep server multiplication order', () => {
  assert.equal(calculateProducerFlow({ elementId: 1, level: 1, step: 7 }, 40).get(901), 23.1)
  assert.equal(
    calculateProducerFlow({ elementId: 81, level: 255, step: 3 }, 40).get(901),
    823981394086973.6,
  )
})

void test('default New-Star producers match their installed resource expressions', () => {
  const expected: [ProducerElementId, number, number][] = [
    [1, 901, 33],
    [2, 902, 22],
    [3, 903, 13.2],
    [4, 911, 22],
    [6, 913, 50],
    [12, 911, 31.5],
    [14, 912, 20],
    [15, 912, 50],
    [21, 914, 10],
    [31, 913, 15],
    [44, 916, 10],
    [81, 901, 330],
    [82, 912, 10],
    [83, 914, 10],
    [84, 913, 10],
    [212, 911, 200 / 6],
  ]
  for (const [elementId, resourceId, amount] of expected) {
    const flow = calculateProducerFlow({ elementId, level: 1, step: 10 }, 40)
    assert.ok(
      Math.abs((flow.get(resourceId) ?? Number.NaN) - amount) < 1e-9,
      `${elementId} production ${resourceId}`,
    )
  }
  assert.equal(calculateProducerFlow({ elementId: 1, level: 1, step: 10 }, 40).get(911), -11)
  assert.equal(calculateProducerFlow({ elementId: 2, level: 1, step: 10 }, 40).get(911), -11)
  assert.equal(calculateProducerFlow({ elementId: 3, level: 1, step: 10 }, 40).get(911), -33)
  assert.equal(calculateProducerFlow({ elementId: 12, level: 1, step: 10 }, 40).get(903), -11)
  assert.equal(calculateProducerFlow({ elementId: 14, level: 0, step: 0 }, 40).get(912), 10)
})

void test('planet production applies energy shortage and all supplied aggregate bonuses', () => {
  const input: ProductionInput = {
    stocks: new Map([[903, 100]]),
    productionSupplyId: 911 as const,
    producers: [
      { elementId: 1, level: 5, step: 10 },
      { elementId: 4, level: 5, step: 10 },
      { elementId: 14, level: 2, step: 10 },
    ],
    maximumTemperature: 40,
    energySpeed: 2,
    resourceMultiplier: 3,
    basicIncome: new Map([
      [901, 20],
      [902, 10],
    ]),
    genericResourceBonus: 0.1,
    resourceBonuses: new Map([[901, 0.2]]),
    supplyBonuses: new Map([
      [911, 0.1],
      [912, 0.2],
    ]),
  }
  const result = calculatePlanetProduction(input)
  assert.equal(result.supplies.get(911)?.total, 354)

  assert.ok(
    Math.abs((result.supplies.get(911)?.consumption ?? Number.NaN) - 161.051) < 1e-9,
    'energy used',
  )
  assert.equal(result.supplies.get(912)?.total, 72)
  assert.ok(
    Math.abs((result.resourcesPerHour.get(901) ?? Number.NaN) - 1002.14835) < 1e-9,
    'metal per hour',
  )
  assert.equal(result.resourcesPerHour.get(902), 30)
  assert.equal(result.resourcesPerHour.get(903), 0)
  const withoutBonus = calculatePlanetProduction({
    ...input,
    genericResourceBonus: 0,
    resourceBonuses: new Map(),
    supplyBonuses: new Map(),
  })

  assert.ok(
    Math.abs((withoutBonus.resourcesPerHour.get(901) ?? Number.NaN) - 784.7295) < 1e-9,
    'metal per hour without bonuses',
  )
  const empty = calculatePlanetProduction({ ...input, producers: [] })
  assert.equal(empty.resourcesPerHour.get(901), 60)
  assert.equal(empty.supplies.get(914)?.total, 0)
})

void test('large supply preserves small demand and the server active output', () => {
  const result = calculatePlanetProduction({
    producers: [
      { elementId: 1, level: 1, step: 10 },
      { elementId: 212, level: 1e18, step: 10 },
    ],
    stocks: new Map(),
    productionSupplyId: 911,
    maximumTemperature: 20,
    energySpeed: 1,
    resourceMultiplier: 1,
    basicIncome: new Map(),
    genericResourceBonus: 0,
    resourceBonuses: new Map(),
    supplyBonuses: new Map(),
  })
  assert.deepEqual(result.supplies.get(911), { total: 3e19, consumption: 11 })
  assert.equal(result.resourcesPerHour.get(901), 33)
})

void test('zero stock suppresses consumption without suppressing the reactor supply', () => {
  const input: ProductionInput = {
    producers: [
      { elementId: 12, level: 1, step: 10 },
      { elementId: 1, level: 1, step: 10 },
    ],
    stocks: new Map([[903, 1]]),
    productionSupplyId: 911 as const,
    maximumTemperature: 40,
    energySpeed: 1,
    resourceMultiplier: 1,
    basicIncome: new Map<number, number>(),
    genericResourceBonus: 0,
    resourceBonuses: new Map<number, number>(),
    supplyBonuses: new Map<number, number>(),
  }
  const fueled = calculatePlanetProduction(input)
  const empty = calculatePlanetProduction({ ...input, stocks: new Map() })
  assert.equal(fueled.resourcesPerHour.get(903), -11)
  assert.equal(empty.resourcesPerHour.get(903), 0)
  assert.deepEqual(empty.supplies, fueled.supplies)
})

void test('the configured supply determines production even when energy is sufficient', () => {
  const input: ProductionInput = {
    producers: [
      { elementId: 1, level: 1, step: 10 },
      { elementId: 4, level: 1, step: 10 },
    ],
    stocks: new Map<number, number>(),
    productionSupplyId: 912 as const,
    maximumTemperature: 40,
    energySpeed: 1,
    resourceMultiplier: 1,
    basicIncome: new Map([[901, 20]]),
    genericResourceBonus: 0,
    resourceBonuses: new Map<number, number>(),
    supplyBonuses: new Map<number, number>(),
  }
  assert.equal(calculatePlanetProduction(input).resourcesPerHour.get(901), 20)
  assert.equal(
    calculatePlanetProduction({ ...input, productionSupplyId: 911 }).resourcesPerHour.get(901),
    53,
  )
})
