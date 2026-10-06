import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { StaticValue } from '../../../src/index.ts'
import { ErrorCode, FleetMission, fleetAjax, readFleetAjax } from '../../../src/index.ts'
import {
  BASE_URL,
  PLANET_ID,
  decode,
  expectOperation,
  gamePage,
  jsonResponse,
  pageReply,
} from '../../helpers.ts'

const QUICK_URL = `${BASE_URL}game.php?ajax=1&page=fleetAjax&cp=${PLANET_ID}`

function payload(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    code: 600,
    mess: 'Fleet sent',
    slots: 3,
    ships: { 210: 0 },
    ...overrides,
  })
}

void test('a quick dispatch carries the mission and the planet it is sent to', async () => {
  await expectOperation(
    (session) =>
      fleetAjax(session, {
        origin: { planetId: PLANET_ID },
        mission: FleetMission.Spy,
        target: { planetId: 1001 },
      }),
    {
      method: 'POST',

      url: QUICK_URL,
      body: [
        ['mission', '6'],
        ['planetID', '1001'],
      ],
    },
    jsonResponse(payload()),
  )
})

void test('a harvest names the recycling mission at the same address', async () => {
  await expectOperation(
    (session) =>
      fleetAjax(session, {
        origin: { planetId: PLANET_ID },
        mission: FleetMission.Recycling,
        target: { planetId: 1002 },
      }),
    {
      method: 'POST',
      url: QUICK_URL,
      body: [
        ['mission', '8'],
        ['planetID', '1002'],
      ],
    },
  )
})

void test('a payload is decoded into the receipt the dispatch answered with', async () => {
  const observed = await decode(
    (session) =>
      fleetAjax(session, {
        origin: { planetId: PLANET_ID },
        mission: FleetMission.Spy,
        target: { planetId: 1001 },
      }),
    jsonResponse(payload({ ships: { 202: 10, 210: 2 } })),
  )
  assert.deepEqual(observed.data, {
    kind: 'fleetAjax',

    observedAtMs: observed.response.observedAtMs,
    code: 600,
    message: 'Fleet sent',
    activeSlots: 3,
    remainingShips: new Map([
      [202, 10],
      [210, 2],
    ]),
  })
})

void test('a quick-dispatch error code raises a server error', async () => {
  await assert.rejects(
    decode(
      (session) =>
        fleetAjax(session, {
          origin: { planetId: PLANET_ID },
          mission: FleetMission.Spy,
          target: { planetId: 1001 },
        }),
      jsonResponse(payload({ code: 604, mess: 'Not enough room', ships: { 202: 10 } })),
    ),
    { code: ErrorCode.ServerError, serverCode: 604, message: 'Not enough room' },
  )
})

void test('an answer that is not a payload is reported as the receipt it is', async () => {
  const redirect = await decode(
    (session) =>
      fleetAjax(session, {
        origin: { planetId: PLANET_ID },
        mission: FleetMission.Spy,
        target: { planetId: 1001 },
      }),
    { status: 302, headers: { Location: './index.php?page=login' } },
  )
  assert.deepEqual(redirect.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}index.php?page=login`),
  })
  const refusal = await decode(
    (session) =>
      fleetAjax(session, {
        origin: { planetId: PLANET_ID },
        mission: FleetMission.Spy,
        target: { planetId: 1001 },
      }),
    pageReply(gamePage('<div class="ally_contents">Module disabled</div>')),
  )
  assert.deepEqual(refusal.data, { kind: 'message', message: 'Module disabled' })
})

void test('a payload that states no message is not a payload this endpoint wrote', () => {
  const broken: [string, StaticValue, string][] = [
    ['no message', { code: '600', slots: '1' }, 'Missing quick fleet message'],
    [
      'a message that is not text',
      { code: '600', mess: true, slots: '1' },
      'Missing quick fleet message',
    ],

    ['no payload at all', null, 'Expected static object'],
    ['an array', [], 'Expected static object'],
  ]
  for (const [name, value, message] of broken)
    assert.throws(() => readFleetAjax(value, 1), { code: ErrorCode.ParseError, message }, name)
})

void test('a dispatch reports the remaining count even when all selected ships left', () => {
  assert.deepEqual(
    readFleetAjax({ code: '600', mess: 'Fleet sent', slots: '1', ships: { 210: '0' } }, 1)
      .remainingShips,
    new Map([[210, 0]]),
  )
  assert.throws(() => readFleetAjax({ code: '600', mess: 'Fleet sent', slots: '1' }, 1), {
    code: ErrorCode.ParseError,
    message: 'Expected static object',
  })
})

void test('a payload whose ship list is not a map is a decoding failure', () => {
  assert.throws(
    () => readFleetAjax({ code: '600', mess: 'Fleet sent', slots: '1', ships: ['202'] }, 1),
    { code: ErrorCode.ParseError, message: 'Expected static object' },
  )
})
