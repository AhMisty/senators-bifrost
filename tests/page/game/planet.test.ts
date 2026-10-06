import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  Ack,
  Coordinate,
  Observed,
  Page,
  PlanetPage,
  PlanetPurchase,
  Session,
} from '../../../src/index.ts'
import {
  ErrorCode,
  parsePage,
  planet,
  planetCoord,
  planetDiameter,
  planetField,
  planetGenerateName,
  readPlanet,
} from '../../../src/index.ts'
import {
  fieldsBlockWithoutTotalBody,
  planetManagementBody,
  planetManagementWithoutRelocationBody,
} from '../../fixtures/game/planets.ts'
import {
  BASE_URL,
  PLANET_ID,
  answer,
  expectOperation,
  gamePage,
  httpResponse,
  jsonResponse,
  pageReply,
  read,
} from '../../helpers.ts'

const PLANET_URL = `${BASE_URL}game.php?page=planet&cp=${PLANET_ID}`

const ANSWERED_PLANET_ID = 2000

const FIELDS: PlanetPurchase = {
  total: 163,
  purchased: 5,
  basePrice: 1,
  priceFactor: 2,
  maximumPurchase: 99,
}

const DIAMETER: PlanetPurchase = {
  total: 8660,
  purchased: 200,
  basePrice: 921,
  priceFactor: 0.5,
  maximumPurchase: 500,
}

const POSITION: Coordinate = { galaxy: 3, system: 4, planet: 5 }

const MANAGEMENT: PlanetPage = {
  kind: 'planet',
  planetId: PLANET_ID,
  observedAtMs: 1,
  fields: FIELDS,
  diameter: DIAMETER,
  relocation: { coordinate: POSITION, restriction: 'Relocate (cooldown 2h)' },
}

function pageOf(content: string, planetId = PLANET_ID): Page {
  return parsePage(httpResponse({ body: gamePage(content, { planetId }) }, PLANET_URL))
}

function diametersWithoutTotal(): string {
  return planetManagementBody.replace('<span>8660 (+200)</span>', '<span>unlimited</span>')
}

const WRITES: [string, (session: Session) => Promise<Observed<Ack>>, string][] = [
  [
    'fields',
    (session) => planetField(session, { planetId: PLANET_ID, amount: 5 }),
    '5 fields bought',
  ],
  [
    'diameter',
    (session) => planetDiameter(session, { planetId: PLANET_ID, amount: 200 }),
    '200 units of diameter bought',
  ],
  [
    'coord',
    (session) => planetCoord(session, { origin: { planetId: PLANET_ID }, target: POSITION }),
    'Relocation started, arrival in 3h',
  ],
]

void test('the management page is read from the figures both purchase boxes carry', () => {
  assert.deepEqual(readPlanet(pageOf(planetManagementBody)), MANAGEMENT)
})

void test('a page that renders no relocation box reports none rather than a failure', () => {
  const document = readPlanet(pageOf(planetManagementWithoutRelocationBody))

  assert.deepEqual(document.fields, { ...FIELDS, purchased: 0 })
  assert.deepEqual(document.diameter, { ...DIAMETER, purchased: 0 })
  assert.equal(document.relocation, null)
})

void test('a purchase box whose heading states no total is a decoding failure', () => {
  const boxes: [string, string][] = [
    ['fields', fieldsBlockWithoutTotalBody],
    ['diameters', diametersWithoutTotal()],
  ]
  for (const [box, body] of boxes)
    assert.throws(
      () => readPlanet(pageOf(body)),
      { code: ErrorCode.ParseError, message: `Missing ${box} total` },
      box,
    )
})

void test('a document carrying none of the boxes is a decoding failure', () => {
  assert.throws(() => readPlanet(pageOf('<p>Nothing to manage here</p>')), {
    code: ErrorCode.ParseError,
    message: 'Expected one #box_fields, found 0',
  })
})

void test('the management page is asked for by address, with no form body', async () => {
  await expectOperation((session) => planet(session, { planetId: PLANET_ID }), {
    method: 'GET',
    url: PLANET_URL,
  })
})

void test('the management page is decoded from the answer the request is given', async () => {
  const document = await read(
    (session) => planet(session, { planetId: PLANET_ID }),
    pageReply(gamePage(planetManagementBody)),
  )

  assert.deepEqual({ ...document, observedAtMs: 1 }, MANAGEMENT)
})

void test('the planet the document states is reported, not the one the request named', async () => {
  const document = await read(
    (session) => planet(session, { planetId: PLANET_ID }),
    pageReply(gamePage(planetManagementBody, { planetId: ANSWERED_PLANET_ID })),
  )
  assert.notEqual(ANSWERED_PLANET_ID, PLANET_ID)
  assert.equal(document.planetId, ANSWERED_PLANET_ID)
})

void test('relocating posts the destination as the three coordinate fields', async () => {
  const server = await expectOperation(
    (session) => planetCoord(session, { origin: { planetId: PLANET_ID }, target: POSITION }),
    {
      method: 'POST',
      url: `${PLANET_URL}&mode=coord`,
      body: [
        ['galaxyt', '3'],
        ['systemt', '4'],
        ['planetst', '5'],
      ],
    },
  )

  assert.equal(server.requests[0]!.headers['Content-Type'], 'application/x-www-form-urlencoded')
})

void test('buying fields posts the count as one field', async () => {
  await expectOperation((session) => planetField(session, { planetId: PLANET_ID, amount: 5 }), {
    method: 'POST',

    url: `${PLANET_URL}&mode=field`,
    body: [['filds', '5']],
  })
})

void test('buying diameter posts the count as one field of its own name', async () => {
  await expectOperation(
    (session) => planetDiameter(session, { planetId: PLANET_ID, amount: 200 }),
    {
      method: 'POST',
      url: `${PLANET_URL}&mode=diameter`,
      body: [['diameters', '200']],
    },
  )
})

void test('every write is answered with the message page it reports its outcome into', async () => {
  for (const [name, run, message] of WRITES) {
    const observed = await answer(
      run,
      pageReply(gamePage(`<div class="ally_contents">${message}</div>`)),
    )
    assert.deepEqual(observed.data, { kind: 'message', message, planetId: PLANET_ID }, name)
  }
})

void test('a caller’s own figure is written as it stands, and the endpoint is what reads it', async () => {
  await expectOperation((session) => planetField(session, { planetId: PLANET_ID, amount: 12.5 }), {
    method: 'POST',
    url: `${PLANET_URL}&mode=field`,
    body: [['filds', '12.5']],
  })
  await expectOperation(
    (session) =>
      planetCoord(session, {
        origin: { planetId: PLANET_ID },
        target: { galaxy: 0, system: 1.5, planet: 2 },
      }),
    {
      method: 'POST',
      url: `${PLANET_URL}&mode=coord`,
      body: [
        ['galaxyt', '0'],
        ['systemt', '1.5'],
        ['planetst', '2'],
      ],
    },
  )
})

void test('a rename suggestion is asked for as a GET, which carries no body', async () => {
  await expectOperation(
    (session) => planetGenerateName(session),
    {
      method: 'GET',
      url: `${BASE_URL}game.php?page=planet&mode=GenerateName`,
    },
    jsonResponse('{"message":"Bifrost"}'),
  )
})

void test('the name the endpoint drew is read from the payload it answers with', async () => {
  const observed = await answer(
    (session) => planetGenerateName(session),
    jsonResponse('{"message":"Bifrost"}'),
  )

  assert.deepEqual(observed.data, { kind: 'json', value: { message: 'Bifrost' } })
})
