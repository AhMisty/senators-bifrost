import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import {
  ErrorCode,
  FleetMission,
  fleetStep2,
  parsePage,
  readFleetStep2,
  readFleetMission,
} from '../../../src/index.ts'
import { fleetStep2WithoutMissions } from '../../fixtures/game/fleet.ts'
import { fleetStep2Body, fleetStep2ChangedTokenBody } from '../../fixtures/game/space.ts'
import {
  BASE_URL,
  PLANET_ID,
  gamePage,
  expectOperation,
  httpResponse,
  pageReply,
  read,
} from '../../helpers.ts'

const STEP2_URL = `${BASE_URL}game.php?page=fleetStep2&cp=${PLANET_ID}`

function pageOf(content: string): Page {
  return parsePage(httpResponse({ body: gamePage(content) }, STEP2_URL))
}

const DESTINATION = { galaxy: 1, system: 2, planet: 4, type: 3 } as const

void test('dispatch choices can be passed to mission and target inputs without casts', () => {
  const mission: FleetMission = readFleetStep2(pageOf(fleetStep2Body)).missions[0]!.value
  assert.equal(mission, FleetMission.Attack)
  assert.throws(() => readFleetMission(9999), { code: ErrorCode.ParseError })
})

void test('the mission form is read from the mark-up and the binding beside it', () => {
  assert.deepEqual(readFleetStep2(pageOf(fleetStep2Body)), {
    kind: 'fleetStep2',
    planetId: PLANET_ID,
    observedAtMs: 1,
    token: 'tok-2',
    missions: [
      { value: 1, label: 'Attack', disabled: false, selected: true },
      { value: 3, label: 'Transport', disabled: false, selected: false },
    ],

    stayOptions: [
      { value: 1, label: '1', disabled: false, selected: true },
      { value: 2, label: '2', disabled: false, selected: false },
    ],
    sectors: [{ value: 3, label: '3', disabled: false, selected: true }],
    capacity: 1000,
    fuel: 25,
  })
})

void test('a form without a mission is a decoding failure, not an empty choice', () => {
  assert.throws(() => readFleetStep2(pageOf(fleetStep2WithoutMissions)), {
    code: ErrorCode.ParseError,
    message: 'Missing dispatch missions',
  })
})

void test('the token the form states is reported as it stands', async () => {
  const document = await read(
    (session) =>
      fleetStep2(session, {
        origin: { planetId: PLANET_ID },
        token: 'tok-2',
        target: DESTINATION,
        speed: 10,
      }),
    pageReply(gamePage(fleetStep2ChangedTokenBody)),
  )
  assert.equal(document.token, 'tok-3')
  assert.notEqual(document.token, 'tok-2')

  assert.deepEqual(document.stayOptions, [])
  assert.deepEqual(document.sectors, [])
})

void test('reading a destination posts the draft it names and the flight it asks for', async () => {
  await expectOperation(
    (session) =>
      fleetStep2(session, {
        origin: { planetId: PLANET_ID },
        token: 'tok-2',
        target: DESTINATION,
        speed: 10,
      }),
    {
      method: 'POST',
      url: STEP2_URL,
      body: [
        ['galaxy', '1'],
        ['system', '2'],
        ['planet', '4'],
        ['type', '3'],
        ['speed', '10'],

        ['fleet_group', '0'],
        ['token', 'tok-2'],
      ],
    },
    pageReply(gamePage(fleetStep2Body)),
  )
})

void test('a group the dispatch joins travels as the field the form submits it under', async () => {
  await expectOperation(
    (session) =>
      fleetStep2(session, {
        origin: { planetId: PLANET_ID },
        token: 'tok-2',
        target: DESTINATION,
        speed: 5,
        fleetGroupId: 7,
      }),
    {
      method: 'POST',
      url: STEP2_URL,
      body: [
        ['galaxy', '1'],
        ['system', '2'],
        ['planet', '4'],
        ['type', '3'],
        ['speed', '5'],
        ['fleet_group', '7'],
        ['token', 'tok-2'],
      ],
    },
  )
})

void test('the answer carries the mission form the caller asked about', async () => {
  const document = await read(
    (session) =>
      fleetStep2(session, {
        origin: { planetId: PLANET_ID },
        token: 'tok-2',
        target: DESTINATION,
        speed: 10,
      }),
    pageReply(gamePage(fleetStep2Body)),
  )
  assert.equal(document.capacity, 1000)
  assert.equal(document.fuel, 25)
})
