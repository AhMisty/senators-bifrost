import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { FleetEvent, PhalanxPage } from '../../../src/index.ts'
import * as bifrost from '../../../src/index.ts'
import { ErrorCode, parsePage, phalanx, readPhalanx } from '../../../src/index.ts'
import {
  cargoTooltip,
  eventWith,
  phalanxEventLog,
  phalanxEventWithoutStateLog,
  phalanxMessageBody,
  phalanxPage,
  shipTooltip,
} from '../../fixtures/game/space.ts'
import {
  BASE_URL,
  decode,
  fakeServer,
  gamePage,
  htmlResponse,
  httpResponse,
  pageReply,
  read,
  sessionOn,
} from '../../helpers.ts'

const PUBLISHED = ['phalanx', 'readPhalanx'] as const

const TARGET = { galaxy: 1, system: 2, planet: 4 }

const SCAN_URL = `${BASE_URL}game.php?galaxy=1&system=2&planet=4&page=phalanx&cp=1000`

const OTHER_PLANET_URL = `${BASE_URL}game.php?galaxy=1&system=2&planet=4&page=phalanx&cp=2000`

const EVENT: FleetEvent = {
  occursAtMs: 1767225600000,
  remainingSeconds: 300,
  state: 'flight',
  mission: 1,
  missionText: 'Attack',
  isOwn: true,
  text:
    'One of your Fleets from Planet Homeworld [1:2:3] reached the Planet Nova [1:2:4].' +
    ' Mission: Attack',
  addresses: [
    { galaxy: 1, system: 2, planet: 3 },
    { galaxy: 1, system: 2, planet: 4 },
  ],
  units: [
    { elementId: 202, name: 'Small Cargo', amount: 10 },
    { elementId: 210, name: 'Recycler', amount: 2 },
  ],
  cargo: new Map([
    [901, 1000],
    [902, 500],
    [903, 100],
  ]),
}

const SCAN: PhalanxPage = {
  kind: 'phalanx',

  observedAtMs: 1,
  target: TARGET,
  heading: 'Investigate position [1:2:4] (Nova)',
  events: [EVENT],
}

function logOf(log: string): FleetEvent[] {
  return readPhalanx(parsePage(httpResponse({ body: gamePage(phalanxPage(log)) }, SCAN_URL))).events
}

function scanPosition(body: string): Promise<PhalanxPage> {
  return read(
    (session) => phalanx(session, { origin: { planetId: 1000 }, target: TARGET }),
    pageReply(body),
  )
}

const REFUSAL = `${phalanxMessageBody}<div class="ally_contents">Not enough deuterium</div>`

void test('the page module publishes every function this test asserts', () => {
  const names: readonly string[] = Object.keys(bifrost)
  for (const name of PUBLISHED) assert.ok(names.includes(name), name)
})

void test('a scan is a load-bearing GET that names the position in its own parameters', async () => {
  const server = fakeServer(pageReply(gamePage(phalanxPage(phalanxEventLog))))
  const observed = await phalanx(sessionOn(server), {
    origin: { planetId: 1000 },
    target: { galaxy: 3, system: 8, planet: 15 },
  })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.body, null)
  assert.equal(
    server.requests[0]!.url.href,
    `${BASE_URL}game.php?galaxy=3&system=8&planet=15&page=phalanx&cp=1000`,
  )
  for (const [name, part] of [
    ['galaxy', 3],
    ['system', 8],
    ['planet', 15],
  ] as const)
    assert.equal(server.requests[0]!.url.searchParams.get(name), String(part), name)
  const data = observed.data
  if (data.kind !== 'phalanx')
    assert.fail(`expected a document, answered with the ${data.kind} receipt`)
  assert.equal(data.heading, SCAN.heading)
  assert.deepEqual(data.events, SCAN.events)
})

void test('the whole of a scan is decoded from the document the server rendered', () => {
  assert.deepEqual(
    readPhalanx(
      parsePage(httpResponse({ body: gamePage(phalanxPage(phalanxEventLog)) }, SCAN_URL)),
    ),
    SCAN,
  )
})

void test('a scan that found no fleet renders an empty log rather than no log', async () => {
  const page = await scanPosition(gamePage(phalanxPage('')))
  assert.deepEqual(page.events, [])
  assert.deepEqual(page.target, TARGET)
  assert.equal('planetId' in page, false)
})

void test('an event is reported from the tooltips its own wording anchors', () => {
  assert.deepEqual(logOf(eventWith(shipTooltip('Small Cargo'))), [
    {
      occursAtMs: 1767225600000,
      remainingSeconds: 300,
      state: 'flight',
      mission: 1,
      missionText: null,
      isOwn: false,
      text: 'Small Cargo',
      addresses: [],
      units: null,
      cargo: null,
    },
  ])
  assert.deepEqual(logOf(eventWith(cargoTooltip(901))), [
    {
      occursAtMs: 1767225600000,
      remainingSeconds: 300,
      state: 'flight',
      mission: 1,

      missionText: 'Attack',
      isOwn: false,
      text: 'Attack',
      addresses: [],
      units: null,
      cargo: new Map([[901, 1]]),
    },
  ])
})

void test('a text block that names no state is not an event this reader can place', async () => {
  await assert.rejects(() => scanPosition(gamePage(phalanxPage(phalanxEventWithoutStateLog))), {
    code: ErrorCode.ParseError,
    message: 'Missing fleet event state',
  })
})

void test('a refused scan is reported as the message page it answered with', async () => {
  const observed = await decode(
    (session) => phalanx(session, { origin: { planetId: 1000 }, target: TARGET }),
    pageReply(gamePage(REFUSAL)),
  )
  assert.deepEqual(observed.data, {
    kind: 'message',
    message: 'Not enough deuterium',
  })
})

void test('a document with no log is a decoding failure rather than an empty scan', async () => {
  await assert.rejects(() => scanPosition(gamePage(phalanxMessageBody)), {
    code: ErrorCode.ParseError,
    message: 'Expected one .fleet_log, found 0',
  })
})

void test('a heading that names no position reports no target', async () => {
  const page = await scanPosition(
    gamePage('<div class="gray_stripe">Investigate position</div><div class="fleet_log"></div>'),
  )
  assert.equal(page.target, null)
  assert.equal(page.heading, 'Investigate position')
})

void test('a scan popup does not require navigation context in its address', () => {
  const page = parsePage(
    httpResponse(htmlResponse(phalanxPage(phalanxEventLog)), `${BASE_URL}game.php?page=phalanx`),
  )
  const reading = readPhalanx(page)
  assert.equal('planetId' in reading, false)
  assert.deepEqual(reading.target, TARGET)
  assert.deepEqual(reading.events, SCAN.events)
})

void test('a popup identifies the requested planet without claiming it was selected', () => {
  const page = parsePage(httpResponse(htmlResponse(phalanxPage(phalanxEventLog)), OTHER_PLANET_URL))
  assert.equal(page.hasPlanet(), false)
  assert.throws(() => page.planetId(), {
    code: ErrorCode.ParseError,
    message: 'Expected one .active_urlpalnet[url], found 0',
  })
  const reading = readPhalanx(page)
  assert.equal('planetId' in reading, false)
})
