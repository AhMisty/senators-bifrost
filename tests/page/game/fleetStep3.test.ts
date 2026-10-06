import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import {
  ErrorCode,
  FleetMission,
  fleetStep1,
  fleetStep2,
  fleetStep3,
  parsePage,
  readFleetStep3,
} from '../../../src/index.ts'
import {
  destinyRow,
  emptyMissionLabel,
  receiptPanel,
  shipRow,
  transportMissionLabel,
} from '../../fixtures/game/fleet.ts'
import {
  fleetStep1PreviewBody,
  fleetStep2Body,
  fleetStep3DispatchReceiptBody,
  fleetStep3EmptyShipReceiptBody,
  fleetStep3UnstatedOriginReceiptBody,
} from '../../fixtures/game/space.ts'
import {
  BASE_URL,
  PLANET_ID,
  expectOperation,
  fakeServer,
  gamePage,
  httpResponse,
  pageReply,
  read,
  sessionOn,
} from '../../helpers.ts'

const STEP3_URL = `${BASE_URL}game.php?page=fleetStep3&cp=${PLANET_ID}`

function pageOf(content: string): Page {
  return parsePage(httpResponse({ body: gamePage(content) }, STEP3_URL))
}

function receipt(options: { mission?: string; ships?: string } = {}): string {
  return receiptPanel(
    options.mission ?? transportMissionLabel,
    options.ships ?? shipRow(202, '10') + shipRow(210, '2'),
  )
}

void test('the dispatch receipt is read from the panel and the ship rows beside it', () => {
  assert.deepEqual(readFleetStep3(pageOf(fleetStep3DispatchReceiptBody)), {
    kind: 'fleetStep3',
    planetId: PLANET_ID,
    observedAtMs: 1,
    missionText: 'Transport',
    origin: { galaxy: 1, system: 2, planet: 3 },
    target: { galaxy: 1, system: 2, planet: 4 },
    ships: new Map([
      [202, 10],
      [210, 2],
    ]),
    fuel: 1234,
    targetArrivalTimeText: '01.01.2026 12:00:00',
    endTimeText: '01.01.2026 13:00:00',
    speed: 17000,
    distance: 42,
  })
})

void test('a panel that names no mission is not the receipt this reader describes', () => {
  const broken: [string, string, string][] = [
    ['a mission span with no text', emptyMissionLabel, 'Missing fleet receipt mission'],
    ['no mission span at all', '', 'Missing fleet receipt mission'],
    [
      'two mission spans',
      transportMissionLabel + emptyMissionLabel,
      'Missing fleet receipt mission',
    ],
  ]
  for (const [name, mission, message] of broken)
    assert.throws(
      () => readFleetStep3(pageOf(receipt({ mission }))),
      {
        code: ErrorCode.ParseError,
        message,
      },
      name,
    )
})

void test('a panel missing one of its figure pairs is incomplete rather than short', () => {
  const withoutTarget = receipt().replace(destinyRow, '')
  const withoutOrigin = receipt().replace(
    '<div class="fleetstep1-5">From <span class="fleetstep1-10">[1:2:3]</span></div>',
    '',
  )
  assert.throws(() => readFleetStep3(pageOf(withoutTarget)), {
    code: ErrorCode.ParseError,
    message: 'Incomplete fleet receipt',
  })
  assert.throws(() => readFleetStep3(pageOf(withoutOrigin)), {
    code: ErrorCode.ParseError,
    message: 'Incomplete fleet receipt',
  })
})

void test('a ship row states the element it flew and the count beside it', () => {
  const rows: [string, string, string][] = [
    [
      'a row whose count is missing',
      receiptPanel(transportMissionLabel, countlessRow()),
      'Invalid fleet receipt ships',
    ],
    [
      'a row whose icon is missing',
      receiptPanel(transportMissionLabel, iconlessRow()),
      'Invalid fleet receipt ships',
    ],
    [
      'a row carrying two icons',
      receiptPanel(transportMissionLabel, twoIconRow()),
      'Invalid fleet receipt ships',
    ],
    [
      'one element listed twice',
      receiptPanel(transportMissionLabel, shipRow(202, '10') + shipRow(202, '5')),
      'Duplicate fleet receipt ship',
    ],
  ]
  for (const [name, body, message] of rows)
    assert.throws(() => readFleetStep3(pageOf(body)), { code: ErrorCode.ParseError, message }, name)
})

function countlessRow(): string {
  return '<div class="alleanza1"><img src="gebaeude/202.gif" class="fleettab13"></div>'
}

function iconlessRow(): string {
  return '<div class="alleanza1"><span class="fleettab15">10</span></div>'
}

function twoIconRow(): string {
  return '<div class="alleanza1"><img src="gebaeude/202.gif"><img src="gebaeude/210.gif"><span class="fleettab15">10</span></div>'
}

void test('a receipt that shipped nothing is not a dispatch', () => {
  assert.throws(() => readFleetStep3(pageOf(receipt({ ships: '' }))), {
    code: ErrorCode.ParseError,
    message: 'Fleet receipt has no ships',
  })
  assert.throws(() => readFleetStep3(pageOf(fleetStep3EmptyShipReceiptBody)), {
    code: ErrorCode.ParseError,
    message: 'Expected a whole number of at least 1',
  })
})

void test('a receipt whose origin cannot be read is a decoding failure', () => {
  assert.throws(() => readFleetStep3(pageOf(fleetStep3UnstatedOriginReceiptBody)), {
    code: ErrorCode.ParseError,
    message: 'Invalid coordinates',
  })
})

void test('flying a dispatch sends the token, the mission and the three cargo fields', async () => {
  await expectOperation(
    (session) =>
      fleetStep3(session, {
        origin: { planetId: PLANET_ID },
        token: 'tok-2',
        mission: FleetMission.Transport,
      }),
    {
      method: 'POST',
      url: STEP3_URL,

      body: [
        ['token', 'tok-2'],
        ['mission', '3'],
        ['metal', '0'],
        ['crystal', '0'],
        ['deuterium', '0'],
      ],
    },
    pageReply(gamePage(fleetStep3DispatchReceiptBody)),
  )
})

void test('the cargo, the hold time and the sector travel only where the caller names them', async () => {
  await expectOperation(
    (session) =>
      fleetStep3(session, {
        origin: { planetId: PLANET_ID },
        token: 'tok-2',
        mission: FleetMission.MilitaryExpedition,
        cargo: { deuterium: 500 },
        stayOption: 2,
        sector: 3,
      }),
    {
      method: 'POST',
      url: STEP3_URL,
      body: [
        ['token', 'tok-2'],
        ['mission', '18'],
        ['metal', '0'],
        ['crystal', '0'],
        ['deuterium', '500'],
        ['staytime', '2'],
        ['sectors', '3'],
      ],
    },
  )
})

void test('the receipt reports what the server really flew', async () => {
  const document = await read(
    (session) =>
      fleetStep3(session, {
        origin: { planetId: PLANET_ID },
        token: 'tok-2',
        mission: FleetMission.Transport,
        cargo: { metal: 1 },
      }),
    pageReply(gamePage(fleetStep3DispatchReceiptBody)),
  )
  assert.equal(document.missionText, 'Transport')
  assert.deepEqual(
    [...document.ships],
    [
      [202, 10],
      [210, 2],
    ],
  )
})

void test('the three steps are three functions and three requests', async () => {
  const server = fakeServer([
    pageReply(gamePage(fleetStep1PreviewBody)),
    pageReply(gamePage(fleetStep2Body)),
    pageReply(gamePage(fleetStep3DispatchReceiptBody)),
  ])
  const session = sessionOn(server)
  const draft = await fleetStep1(session, {
    origin: { planetId: PLANET_ID },
    ships: new Map([[202, 5]]),
  })
  assert.ok('token' in draft.data)
  const form = await fleetStep2(session, {
    origin: { planetId: PLANET_ID },
    token: draft.data.token,
    target: { galaxy: 1, system: 2, planet: 4, type: 1 },
    speed: 10,
  })
  assert.ok('token' in form.data)
  const flown = await fleetStep3(session, {
    origin: { planetId: PLANET_ID },
    token: form.data.token,
    mission: FleetMission.Transport,
  })
  assert.equal(server.requests.length, 3)
  assert.deepEqual(
    server.requests.map((request) => request.url.searchParams.get('page')),
    ['fleetStep1', 'fleetStep2', 'fleetStep3'],
  )

  assert.equal(server.requests[1]!.body?.get('token'), draft.data.token)
  assert.equal(server.requests[2]!.body?.get('token'), form.data.token)
  assert.equal(flown.data.kind, 'fleetStep3')
})
