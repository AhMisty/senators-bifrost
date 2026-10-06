import assert from 'node:assert/strict'
import { test } from 'node:test'

import { adminFlyingFleet, adminFlyingFleetSetBusy } from '../../../src/index.ts'
import { FLYING_FLEET_BODY, FLYING_FLEET_EMPTY_BODY } from '../../fixtures/admin/listPages.ts'
import { BASE_URL, expectOperation, pageHtml, pageReply, read } from '../../helpers.ts'

const FLYING_FLEET_URL = `${BASE_URL}admin.php?page=flyingFleet`

void test('a fleet in flight is read with its mission, its group and both its ends', async () => {
  const flying = await read(adminFlyingFleet, pageReply(pageHtml(FLYING_FLEET_BODY)))
  assert.equal('planetId' in flying, false)
  assert.deepEqual(flying.fleets[0], {
    id: 42,
    missionText: 'Transport',
    group: { id: 7, name: 'Nova' },
    departureAtText: '01.02.2026 10:00:00',
    arrivalAtText: '01.02.2026 12:00:00',
    returnAtText: '01.02.2026 14:00:00',
    holdText: '01.02.2026 13:00:00 (2 h)',
    shipCount: 1234,
    ships: [
      { name: 'Small Cargo', amount: 10 },
      { name: 'Light Fighter', amount: 5 },
    ],
    resources: [
      { name: 'Metal', amount: 1000 },
      { name: 'Crystal', amount: 500 },
    ],
    origin: {
      player: { id: 1, name: 'Yaro' },
      planet: {
        id: 1000,
        name: 'Homeworld',
        coordinate: { galaxy: 1, system: 2, planet: 3 },
      },
    },
    target: {
      player: { id: 7, name: 'Cheater' },
      planet: {
        id: 1001,
        name: 'Colony',
        coordinate: { galaxy: 1, system: 2, planet: 4 },
      },
    },
    locked: true,
    broken: false,
  })
})

void test('a fleet flying alone reports no group, and the cells it left out report nothing', async () => {
  const flying = await read(adminFlyingFleet, pageReply(pageHtml(FLYING_FLEET_BODY)))
  assert.deepEqual(
    flying.fleets.slice(1).map((fleet) => ({
      id: fleet.id,
      missionText: fleet.missionText,
      group: fleet.group,
      holdText: fleet.holdText,
      shipCount: fleet.shipCount,
      locked: fleet.locked,
      broken: fleet.broken,
      target: fleet.target,
      ships: fleet.ships,
      resources: fleet.resources,
    })),
    [
      {
        id: 43,
        missionText: 'Recycling',
        group: null,
        holdText: '01.02.2026 13:30:00 (2 h)',
        shipCount: 3,
        locked: false,
        broken: false,
        target: {
          player: { id: null, name: '' },
          planet: {
            id: 1001,
            name: 'Colony',
            coordinate: { galaxy: 1, system: 2, planet: 4 },
          },
        },
        ships: [{ name: 'Recycler', amount: 3 }],
        resources: [{ name: 'Deuterium', amount: 12 }],
      },
      {
        id: 44,
        missionText: 'Station',
        group: null,
        holdText: '-',
        shipCount: 1,
        locked: false,
        broken: true,
        target: {
          player: { id: null, name: '' },
          planet: {
            id: null,
            name: 'Colony',
            coordinate: { galaxy: 1, system: 2, planet: 4 },
          },
        },
        ships: [{ name: 'Solar Satellite', amount: 1 }],
        resources: [{ name: 'Metal', amount: 0 }],
      },
      {
        id: 45,
        missionText: 'Transport',
        group: null,
        holdText: '-',
        shipCount: 0,
        locked: false,
        broken: false,
        target: {
          player: { id: null, name: '' },
          planet: {
            id: null,
            name: 'Colony',
            coordinate: { galaxy: 1, system: 2, planet: 4 },
          },
        },

        ships: [],
        resources: [{ name: 'Metal', amount: 0 }],
      },
    ],
  )
})

void test('a fleet that is neither held nor broken states neither of those two things', async () => {
  const flying = await read(adminFlyingFleet, pageReply(pageHtml(FLYING_FLEET_BODY)))
  assert.deepEqual(
    flying.fleets.map((fleet) => [fleet.id, fleet.locked, fleet.broken]),
    [
      [42, true, false],
      [43, false, false],
      [44, false, true],
      [45, false, false],
    ],
  )
})

void test('a server with no fleet in flight states an empty list', async () => {
  const flying = await read(adminFlyingFleet, pageReply(pageHtml(FLYING_FLEET_EMPTY_BODY)))
  assert.deepEqual(flying.fleets, [])
  assert.equal('planetId' in flying, false)
})

void test('the fleet list read is the one address the page owns', async () => {
  await expectOperation((session) => adminFlyingFleet(session), { url: FLYING_FLEET_URL })
})

void test('the busy control sends each server value without claiming deletion', async () => {
  const asked: [Parameters<typeof adminFlyingFleetSetBusy>[1], string][] = [
    [{ fleetId: 42, busy: 0 }, `${BASE_URL}admin.php?id=42&lock=0&page=flyingFleet`],
    [{ fleetId: 43, busy: 1 }, `${BASE_URL}admin.php?id=43&lock=1&page=flyingFleet`],
    [{ fleetId: 44, busy: 2 }, `${BASE_URL}admin.php?id=44&lock=2&page=flyingFleet`],
  ]
  for (const [options, url] of asked)
    await expectOperation((session) => adminFlyingFleetSetBusy(session, options), { url })
})
