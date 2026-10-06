import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { BattleSimulatorPage } from '../../../src/index.ts'
import * as bifrost from '../../../src/index.ts'
import {
  ErrorCode,
  battleSimulator,
  battleSimulatorSend,
  parsePage,
  readBattleSimulator,
} from '../../../src/index.ts'
import {
  battleSimulatorBody,
  battleSimulatorForeignSlotBody,
  simulatorTab,
  simulatorUnit,
} from '../../fixtures/game/space.ts'
import {
  BASE_URL,
  answer,
  expectOperation,
  gamePage,
  httpResponse,
  jsonResponse,
  pageReply,
  read,
  sessionOn,
  fakeServer,
} from '../../helpers.ts'

const PUBLISHED = ['battleSimulator', 'battleSimulatorSend', 'readBattleSimulator'] as const

const CATALOGUE_URL = `${BASE_URL}game.php?slots=3&page=battleSimulator&cp=1000`

const SEND_URL = `${BASE_URL}game.php?page=battleSimulator&mode=send`

const CATALOGUE: BattleSimulatorPage = {
  kind: 'battleSimulator',
  planetId: 1000,
  observedAtMs: 1,
  bonusIds: [109, 110],
  slots: [
    { index: 0, attackers: [202, 210], defenders: [202, 210, 401] },
    { index: 1, attackers: [202, 210], defenders: [202, 210] },
  ],
}

const MALFORMED_TAB = `<div id="tabs-0">${simulatorUnit(
  202,
  'Small Cargo',
  '<input type="text" name="battleinput[0][0]">',
  '',
)}</div>`

void test('the page module publishes every function this test asserts', () => {
  const names: readonly string[] = Object.keys(bifrost)
  for (const name of PUBLISHED) assert.ok(names.includes(name), name)
})

void test('the catalogue is a GET that asks for one tab unless the caller names more', async () => {
  const server = fakeServer(pageReply(gamePage(battleSimulatorBody())))
  const observed = await battleSimulator(sessionOn(server), { planetId: 1000 })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.body, null)
  assert.equal(
    server.requests[0]!.url.href,
    `${BASE_URL}game.php?slots=1&page=battleSimulator&cp=1000`,
  )
  assert.equal(observed.data.kind, 'battleSimulator')
})

void test('a caller naming a slot count asks for that many tabs', async () => {
  await expectOperation((session) => battleSimulator(session, { planetId: 1000, slots: 3 }), {
    method: 'GET',
    url: CATALOGUE_URL,
  })
})

void test('the tabs are decoded with the controls each side of them offers', () => {
  assert.deepEqual(
    readBattleSimulator(
      parsePage(httpResponse({ body: gamePage(battleSimulatorBody()) }, CATALOGUE_URL)),
    ),
    CATALOGUE,
  )
})

void test('a single tab is one slot, with the defences only the first tab renders', () => {
  const page = readBattleSimulator(
    parsePage(
      httpResponse(
        { body: gamePage(`<div id="tabs">${simulatorTab(0, true)}</div>`) },
        CATALOGUE_URL,
      ),
    ),
  )
  assert.deepEqual(page.slots, [{ index: 0, attackers: [202, 210], defenders: [202, 210, 401] }])
  assert.deepEqual(page.bonusIds, [109, 110])
})

void test('a tab that renders no control lists neither side', () => {
  const page = readBattleSimulator(
    parsePage(httpResponse({ body: gamePage('<div id="tabs-0"></div>') }, CATALOGUE_URL)),
  )
  assert.deepEqual(page, {
    kind: 'battleSimulator',
    planetId: 1000,
    observedAtMs: 1,
    bonusIds: [],
    slots: [{ index: 0, attackers: [], defenders: [] }],
  })
})

void test('a document with no first tab is a decoding failure', async () => {
  await assert.rejects(
    () =>
      read(
        (session) => battleSimulator(session, { planetId: 1000 }),
        pageReply(gamePage('<p>x</p>')),
      ),
    { code: ErrorCode.ParseError, message: 'Expected one #tabs-0, found 0' },
  )
})

void test('a control naming another slot is a decoding failure', async () => {
  await assert.rejects(
    () =>
      read(
        (session) => battleSimulator(session, { planetId: 1000 }),
        pageReply(gamePage(battleSimulatorForeignSlotBody)),
      ),
    { code: ErrorCode.ParseError, message: 'Invalid battle simulator field' },
  )
})

void test('a control that is not a simulator field is a decoding failure', async () => {
  await assert.rejects(
    () =>
      read(
        (session) => battleSimulator(session, { planetId: 1000 }),
        pageReply(gamePage(MALFORMED_TAB)),
      ),
    { code: ErrorCode.ParseError, message: 'Invalid battle simulator field' },
  )
})

void test('a submission is a POST that states a zero for every bonus in the catalogue', async () => {
  const server = await expectOperation(
    (session) =>
      battleSimulatorSend(session, {
        catalog: CATALOGUE,
        attackers: [{ units: new Map([[202, 5]]), bonuses: new Map([[109, 3]]) }],
        defenders: [{ units: new Map([[401, 1]]) }],
        resources: { metal: 1000, deuterium: 7 },
      }),
    {
      method: 'POST',
      url: SEND_URL,
      body: [
        ['battleinput[0][0][109]', '3'],
        ['battleinput[0][0][110]', '0'],
        ['battleinput[0][0][202]', '5'],
        ['battleinput[0][1][109]', '0'],
        ['battleinput[0][1][110]', '0'],
        ['battleinput[0][1][401]', '1'],
        ['battleinput[0][1][901]', '1000'],
        ['battleinput[0][1][902]', '0'],
        ['battleinput[0][1][903]', '7'],
      ],
    },
    jsonResponse('{"id":7}'),
  )
  assert.equal(server.requests[0]!.headers['Content-Type'], 'application/x-www-form-urlencoded')
})

void test('only supplied battle groups are submitted', async () => {
  await expectOperation(
    (session) =>
      battleSimulatorSend(session, {
        catalog: CATALOGUE,
        attackers: [{ units: new Map([[202, 1]]) }],
        defenders: [],
      }),
    {
      method: 'POST',
      url: SEND_URL,
      body: [
        ['battleinput[0][0][109]', '0'],
        ['battleinput[0][0][110]', '0'],
        ['battleinput[0][0][202]', '1'],
        ['battleinput[0][1][901]', '0'],
        ['battleinput[0][1][902]', '0'],
        ['battleinput[0][1][903]', '0'],
      ],
    },
  )
})

void test('all supplied groups reach the server without a local slot limit', async () => {
  const server = fakeServer()
  await battleSimulatorSend(sessionOn(server), {
    catalog: CATALOGUE,
    attackers: [
      { units: new Map([[202, 1]]) },
      { units: new Map([[202, 2]]) },
      { units: new Map([[202, 3]]) },
    ],
    defenders: [],
  })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.body?.get('battleinput[2][0][202]'), '3')
})

void test('a catalogue that names no slot is still submitted as the first one', async () => {
  const server = await expectOperation(
    (session) =>
      battleSimulatorSend(session, {
        catalog: { bonusIds: [] },
        attackers: [{ units: new Map([[202, 4]]) }],
        defenders: [{ units: new Map([[401, 2]]) }],
      }),
    {
      method: 'POST',
      url: SEND_URL,
      body: [
        ['battleinput[0][0][202]', '4'],
        ['battleinput[0][1][401]', '2'],
        ['battleinput[0][1][901]', '0'],
        ['battleinput[0][1][902]', '0'],
        ['battleinput[0][1][903]', '0'],
      ],
    },
  )
  assert.equal(server.requests.length, 1)
})

void test('the report a simulation stored is read from the JSON receipt', async () => {
  const observed = await answer(
    (session) =>
      battleSimulatorSend(session, {
        catalog: CATALOGUE,
        attackers: [],
        defenders: [],
      }),
    jsonResponse('{"id":7}'),
  )
  assert.deepEqual(observed.data, { kind: 'json', value: { id: '7' } })
})

void test('the simulator failure sentinel raises a server error with its response', async () => {
  for (const response of [
    jsonResponse('0'),
    { body: '0', headers: { 'Content-Type': 'text/html' } },
  ])
    await assert.rejects(
      answer(
        (session) =>
          battleSimulatorSend(session, {
            catalog: { bonusIds: [] },
            attackers: [],
            defenders: [],
          }),
        response,
      ),
      { code: ErrorCode.ServerError, serverCode: 0 },
    )
})
