import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page, Session } from '../../../src/index.ts'
import {
  ErrorCode,
  delivery,
  deliverySend,
  parsePage,
  readDelivery,
  reduceFleet,
  reduceResources,
} from '../../../src/index.ts'
import {
  deliveryCostScript,
  foreignPageForm,
  logisticsPageContent,
  resourceCells,
  row,
  withCostOneMention,
  withDeliveryCost,
} from '../../fixtures/game/logistics.ts'
import {
  BASE_URL,
  PLANET_ID,
  decode,
  expectOperation,
  gamePage,
  httpResponse,
  pageReply,
} from '../../helpers.ts'

const PLAN_URL = `${BASE_URL}game.php?page=delivery&cp=${PLANET_ID}`
const SEND_URL = `${BASE_URL}game.php?page=delivery&cp=${PLANET_ID}&mode=delivery`

function pageOf(content: string): Page {
  return parsePage(httpResponse({ body: content }, PLAN_URL))
}

function planDocument(): string {
  const rows =
    row(1000, 'Homeworld', '[1:2:3]', '00:00:00', resourceCells('1.000', '500', '100')) +
    row(1001, 'Nova', '[1:2:4]', '01:30:00', resourceCells('2.000', '800', '200'))
  return withDeliveryCost(gamePage(logisticsPageContent('delivery', rows)), 30)
}

void test('the plan is read row by row, with the fee it charges per destination', async () => {
  const observed = await decode(
    (session) => delivery(session, { planetId: PLANET_ID }),
    pageReply(planDocument()),
  )
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'delivery',
    planetId: PLANET_ID,
    observedAtMs: observed.response.observedAtMs,
    candidates: [
      {
        planetId: 1000,
        name: 'Homeworld',
        coordinate: { galaxy: 1, system: 2, planet: 3 },
        travelTimeText: '00:00:00',

        resourceTexts: ['1.000', '500', '100'],
      },
      {
        planetId: 1001,
        name: 'Nova',
        coordinate: { galaxy: 1, system: 2, planet: 4 },
        travelTimeText: '01:30:00',
        resourceTexts: ['2.000', '800', '200'],
      },
    ],

    feePerDestination: 30,
  })
})

void test('a row that rendered no coordinate states none', () => {
  const rows = row(1000, 'Homeworld', '', '00:00:00', resourceCells('1.000', '500', '100'))
  const document = readDelivery(
    pageOf(withDeliveryCost(gamePage(logisticsPageContent('delivery', rows)), 30)),
  )
  assert.deepEqual(document.candidates, [
    {
      planetId: 1000,
      name: 'Homeworld',
      coordinate: null,
      travelTimeText: '00:00:00',
      resourceTexts: ['1.000', '500', '100'],
    },
  ])
})

void test('a plan the endpoint refused to draw is an empty plan rather than a failure', () => {
  const document = readDelivery(
    pageOf(withDeliveryCost(gamePage(logisticsPageContent('delivery', '')), 30)),
  )
  assert.deepEqual(document.candidates, [])
})

void test('a plan whose fee the page never bound is a decoding failure', () => {
  const rows = row(1000, 'Homeworld', '[1:2:3]', '00:00:00', '')
  const mentioned = withCostOneMention(gamePage(logisticsPageContent('delivery', rows)))
  assert.throws(() => readDelivery(pageOf(mentioned)), {
    code: ErrorCode.ParseError,
    message: 'Expected one CostOne binding, found 0',
  })
})

void test('a response from another page is refused', () => {
  assert.throws(() => readDelivery(pageOf(gamePage(foreignPageForm))), {
    code: ErrorCode.ParseError,
    message: 'Missing or ambiguous delivery form',
  })
})

void test('reading the plan asks the page’s own address', async () => {
  await expectOperation((session) => delivery(session, { planetId: PLANET_ID }), { url: PLAN_URL })
})

void test('a delivery flies the freighters with one field per stock resource', async () => {
  await expectOperation(
    (session) =>
      deliverySend(session, {
        origin: { planetId: PLANET_ID },
        resources: { metal: 1000, crystal: 500, deuterium: 100 },
        targets: [{ planetId: 1001 }, { planetId: 1002 }],
      }),
    {
      method: 'POST',

      url: SEND_URL,
      body: [
        ['r901', '1000'],
        ['r902', '500'],
        ['r903', '100'],
        ['palanets[]', '1001'],
        ['palanets[]', '1002'],
      ],
    },
  )
})

void test('an amount the caller omitted is submitted as zero', async () => {
  await expectOperation(
    (session) =>
      deliverySend(session, {
        origin: { planetId: PLANET_ID },
        resources: { deuterium: 7 },
        targets: [{ planetId: 1001 }],
      }),
    {
      method: 'POST',
      url: SEND_URL,
      body: [
        ['r901', '0'],
        ['r902', '0'],
        ['r903', '7'],
        ['palanets[]', '1001'],
      ],
    },
  )
})

void test('a delivery the endpoint served is reported as its message', async () => {
  const observed = await decode(
    (session) =>
      deliverySend(session, {
        origin: { planetId: PLANET_ID },
        resources: {},
        targets: [{ planetId: 1001 }],
      }),
    pageReply(gamePage('<div class="ally_contents">Freighters sent</div>')),
  )
  assert.deepEqual(observed.data, { planetId: 1000, kind: 'message', message: 'Freighters sent' })
})

void test('the three logistics plans are three documents at three routes', async () => {
  const plans: [(session: Session) => Promise<unknown>, string][] = [
    [(session) => delivery(session, { planetId: PLANET_ID }), PLAN_URL],
    [
      (session) => reduceFleet(session, { planetId: PLANET_ID }),
      `${BASE_URL}game.php?page=reduceFleet&cp=${PLANET_ID}`,
    ],
    [
      (session) => reduceResources(session, { planetId: PLANET_ID }),
      `${BASE_URL}game.php?page=reduceResources&cp=${PLANET_ID}`,
    ],
  ]
  for (const [run, url] of plans) await expectOperation(run, { url }, {})
})

void test('the fee is the binding the server writes, not a constant of this library', () => {
  assert.match(deliveryCostScript, /CostOne = 30/)
  const rows = row(1000, 'Homeworld', '[1:2:3]', '00:00:00', '')
  const document = readDelivery(
    pageOf(gamePage(logisticsPageContent('delivery', rows)).replace('</body>', deliveryCostScript)),
  )
  assert.equal(document.feePerDestination, 30)
})
