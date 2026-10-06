import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  calculateConstructionSeconds,
  calculateSupplyBalance,
  calculateFleetDistance,
  calculateFleetDuration,
  calculateFleetFuel,
  calculateLevelPrice,
  calculateMissileDuration,
  calculateResourceProduction,
  calculateShipConsumption,
  calculateShipSpeed,
} from '../../src/index.ts'

const home = { galaxy: 1, system: 10, planet: 5 }

void test('supply rounding follows PHP at half boundaries and its precision limit', () => {
  for (const [generation, expected] of [
    [0, 0],
    [0.49999999999999994, 1],
    [1.4999999999999998, 2],
    [-1.5, -2],
    [99999999999999.4, 99999999999999],
    [99999999999999.5, 100000000000000],
    [999999999999999.4, 999999999999999],
    [999999999999999.5, 1000000000000000],
    [1000000000000000.4, 1000000000000000.4],
  ] as const)
    assert.equal(
      calculateSupplyBalance({ generation, consumption: 0, speed: 1, bonus: 0 }).total,
      expected,
    )
})

void test('prices and fleet fuel keep the server arithmetic order before rounding', () => {
  assert.equal(
    calculateLevelPrice({
      baseCosts: new Map([[901, 1_000_000]]),
      factor: 2,
      completedLevel: 40,
      costReduction: 0.7,
    }).get(901),
    329853488332800000,
  )
  assert.equal(
    calculateFleetFuel({
      distance: 1005,
      durationSeconds: 10,
      fleetSpeedFactor: 1,
      ships: [{ amount: 1e9, speed: 5000, consumption: 20 }],
    }),
    14146049907930972,
  )
})

void test('New-Star distance follows the first differing coordinate axis', () => {
  assert.equal(calculateFleetDistance(home, { galaxy: 2, system: 10, planet: 5 }), 20_000)
  assert.equal(calculateFleetDistance(home, { galaxy: 1, system: 11, planet: 5 }), 2795)
  assert.equal(calculateFleetDistance(home, { galaxy: 1, system: 10, planet: 6 }), 1005)
  assert.equal(calculateFleetDistance(home, home), 5)
})

void test('fleet duration and fuel match the server formulas for known ship data', () => {
  const duration = calculateFleetDuration({
    distance: 1000,
    slowestShipSpeed: 10_000,
    selectedSpeed: 10,
    fleetSpeedFactor: 1,
    minimumFleetSeconds: 5,
  })
  assert.equal(duration, 3510)
  assert.equal(
    calculateFleetFuel({
      distance: 1000,
      durationSeconds: duration,
      fleetSpeedFactor: 1,
      ships: [{ amount: 1, speed: 10_000, consumption: 100 }],
    }),
    12,
  )
  assert.equal(
    calculateFleetDuration({
      distance: 1000,
      slowestShipSpeed: 10_000,
      selectedSpeed: 10,
      fleetSpeedFactor: 1000,
      minimumFleetSeconds: 5,
    }),
    5,
  )
  assert.equal(
    calculateFleetFuel({
      distance: 1000,
      durationSeconds: duration,
      fleetSpeedFactor: 1,
      ships: [{ amount: 1, speed: 10_000, consumption: 0 }],
    }),
    1,
  )
  assert.deepEqual(
    calculateShipSpeed({
      baseSpeed: 10_000,
      driveCode: 1,
      impulseLevel: 0,
      hyperspaceLevel: 0,
      driveBonuses: { combustion: 0.1, impulse: 0.2, hyperspace: 0.3 },
      generalBonus: 0.2,
    }),
    { drive: 'combustion', speed: 13_000 },
  )
})

void test('ship drive and fuel switches follow the server thresholds', () => {
  const bonuses = { combustion: 0, impulse: 0.2, hyperspace: 0.5 }
  for (const [driveCode, impulseLevel, hyperspaceLevel, drive] of [
    [2, 0, 0, 'impulse'],
    [3, 0, 0, 'hyperspace'],
    [4, 4, 0, 'combustion'],
    [4, 5, 0, 'impulse'],
    [5, 0, 7, 'impulse'],
    [5, 0, 8, 'hyperspace'],
  ] as const)
    assert.equal(
      calculateShipSpeed({
        baseSpeed: 100,
        driveCode,
        impulseLevel,
        hyperspaceLevel,
        driveBonuses: bonuses,
        generalBonus: 0,
      }).drive,
      drive,
    )
  const ship = {
    elementId: 202,
    baseConsumption: 100,
    alternateConsumption: 200,
    impulseLevel: 4,
    hyperspaceLevel: 0,
    fuelConsumptionFactor: 0,
  }
  assert.equal(calculateShipConsumption(ship), 200)
  assert.equal(calculateShipConsumption({ ...ship, impulseLevel: 5 }), 400)
  assert.equal(calculateShipConsumption({ ...ship, elementId: 211, hyperspaceLevel: 8 }), 400)
  assert.equal(calculateShipConsumption({ ...ship, elementId: 203 }), 200)
  assert.ok(calculateShipConsumption({ ...ship, fuelConsumptionFactor: 0.1 }) < 200)
})

void test('missile duration follows system distance and the universe fleet multiplier', () => {
  assert.equal(
    calculateMissileDuration({
      originSystem: 10,
      targetSystem: 12,
      fleetSpeedFactor: 2,
      minimumFleetSeconds: 5,
    }),
    75,
  )
  assert.equal(
    calculateMissileDuration({
      originSystem: 10,
      targetSystem: 10,
      fleetSpeedFactor: 100,
      minimumFleetSeconds: 5,
    }),
    5,
  )
})

void test('level prices apply account discounts and level factors without display rounding', () => {
  const baseCosts = new Map([
    [901, 100],
    [902, 0],
  ])
  assert.deepEqual(
    calculateLevelPrice({
      baseCosts,
      factor: 1.5,
      completedLevel: 2,
      costReduction: 0.1,
    }),
    new Map([[901, 202.5]]),
  )
  for (const factor of [0, 1])
    assert.deepEqual(
      calculateLevelPrice({
        baseCosts,
        factor,
        completedLevel: 2,
        costReduction: 0.1,
      }),
      new Map([[901, 90]]),
    )
  assert.deepEqual(
    calculateLevelPrice({
      baseCosts,
      factor: 2,
      completedLevel: 2,
      costReduction: 1,
    }),
    new Map(),
  )

  assert.deepEqual(
    calculateLevelPrice({
      baseCosts,
      factor: 1.5,
      completedLevel: 2,
      costReduction: 0.1,
      dismantling: true,
    }),
    new Map([[901, 101.25]]),
  )
})

void test('energy shortage and dynamic account bonuses govern hourly output', () => {
  const energy = calculateSupplyBalance({
    generation: 100,
    consumption: 80,
    speed: 2,
    bonus: 0.1,
  })
  assert.deepEqual(energy, { total: 220, consumption: 160 })
  assert.equal(
    calculateResourceProduction({
      generation: 100,
      consumption: 10,
      supply: energy,
      genericBonus: 0.1,
      resourceBonus: 0.2,
      resourceMultiplier: 2,
    }),
    240,
  )
  assert.equal(
    calculateResourceProduction({
      generation: 100,
      consumption: 10,
      supply: { total: 80, consumption: 160 },
      genericBonus: 0.1,
      resourceBonus: 0.2,
      resourceMultiplier: 2,
    }),
    110,
  )
  assert.equal(
    calculateResourceProduction({
      generation: 100,
      consumption: 10,
      supply: { total: 0, consumption: 0 },
      genericBonus: 0,
      resourceBonus: 0,
      resourceMultiplier: 1,
    }),
    0,
  )
})

void test('construction duration applies the server category, speed level and minimum', () => {
  const common = {
    costs: new Map([[901, 1]]),
    speedResourceIds: [901],
    gameSpeed: 2500,
    speedResourceLevel: 0,
    minimumBuildSeconds: 5,
  }
  assert.equal(calculateConstructionSeconds({ category: 'building', ...common }), 480)
  assert.equal(calculateConstructionSeconds({ category: 'research', ...common }), 11_999)
  for (const category of ['ship', 'defense', 'missile'] as const)
    assert.equal(calculateConstructionSeconds({ category, ...common }), 480)
  assert.equal(
    calculateConstructionSeconds({
      category: 'building',
      ...common,
      speedResourceLevel: 1,
    }),
    240,
  )
  assert.equal(
    calculateConstructionSeconds({
      category: 'building',
      ...common,
      dismantling: true,
    }),
    173,
  )
  assert.equal(
    calculateConstructionSeconds({
      category: 'building',
      ...common,
      minimumBuildSeconds: 500,
    }),
    500,
  )
  assert.equal(
    calculateConstructionSeconds({
      category: 'building',
      ...common,
      speedResourceIds: [902],
    }),
    5,
  )
})
