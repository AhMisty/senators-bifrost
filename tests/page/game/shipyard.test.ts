import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page, Session } from '../../../src/index.ts'
import * as bifrost from '../../../src/index.ts'
import {
  ErrorCode,
  parsePage,
  readShipyard,
  shipyard,
  shipyardCancel,
  shipyardDefense,
  shipyardProduce,
} from '../../../src/index.ts'
import {
  shipyardDefenseBody,
  shipyardElapsedBeyondUnitBody,
  shipyardEmptyQueueBody,
  shipyardEmptyQueueObjectBody,
  shipyardMissingInventoryCellBody,
  shipyardPageBody,
  shipyardRepeatedInventoryCellBody,
  shipyardShortQueueTupleBody,
  shipyardUnbracketedInventoryBody,
  shipyardUnformattedQuantityBody,
  shipyardUnnamedQueueTupleBody,
  shipyardZeroDurationBody,
} from '../../fixtures/game/construction.ts'
import {
  BASE_URL,
  PLANET_ID,
  answer,
  expectOperation,
  gamePage,
  httpResponse,
  pageReply,
  read,
  tickerHeader,
} from '../../helpers.ts'

const HEADER = tickerHeader({
  metal: ['1000', '600', '100000'],
  crystal: ['500', '300', '100000'],
  deuterium: ['100', '60', '50000'],
  energy: ['500', '1234'],
})

const SHIPYARD_URL = `${BASE_URL}game.php?page=shipyard&cp=${PLANET_ID}`

const DEFENSE_URL = `${BASE_URL}game.php?page=shipyard&cp=${PLANET_ID}&mode=defense`

function documentOf(content: string): string {
  return gamePage(content, { planetId: PLANET_ID, header: HEADER })
}

function pageOf(content: string): Page {
  return parsePage(httpResponse({ body: documentOf(content) }, SHIPYARD_URL))
}

const QUEUE_WITHOUT_A_LIST = '<script>data = {"b_hangar_id_plus":0};</script>'

const QUEUE_WITH_A_NON_TUPLE =
  '<script>data = {"Queue":["Small Cargo"],"b_hangar_id_plus":0};</script>'

const INVENTORY_WITH_A_TRUNCATED_FIGURE = [
  '<div id="build_elements"><div class="build_elements">',
  '<div id="s_202" class="build_box"><div class="content_box">',
  '<div class="hang4" id="val_202"> (1</div>',
  '</div></div>',
  '</div></div>',
  '<script>data = [];</script>',
].join('')

const WITHOUT_A_CATALOGUE = '<p>no catalogue here</p><script>data = [];</script>'

const EXPORTS: Readonly<Record<string, unknown>> = {
  readShipyard,
  shipyard,
  shipyardDefense,
  shipyardProduce,
  shipyardCancel,
}

void test('the page publishes two readers and the queue’s two commands', () => {
  const published = Object.entries(bifrost)
    .map(([name]) => name)
    .filter((name) => name === 'readShipyard' || name.startsWith('shipyard'))
    .toSorted()
  assert.deepEqual(published, Object.keys(EXPORTS).toSorted())
  for (const [name, value] of Object.entries(EXPORTS)) assert.equal(typeof value, 'function', name)
})

void test('the fleet catalogue is read from the document the page rendered', async () => {
  const document = await read(
    (session) => shipyard(session, { planetId: PLANET_ID }),
    pageReply(gamePage(shipyardPageBody, { planetId: PLANET_ID, header: HEADER })),
  )
  assert.deepEqual(document, {
    kind: 'shipyard',
    planetId: PLANET_ID,
    observedAtMs: document.observedAtMs,
    catalogue: 'fleet',

    inventory: new Map([
      [202, 1234],
      [203, 0],
    ]),
    quotes: new Map([
      [
        202,
        {
          elementId: 202,
          costs: new Map([
            [901, 2000],
            [902, 2000],
          ]),
          durationSeconds: 1200,
          maximumBuildable: 12,
        },
      ],
      [
        203,
        {
          elementId: 203,
          costs: new Map([
            [901, 6000],
            [902, 6000],
          ]),
          durationSeconds: 3000,
          maximumBuildable: 0,
        },
      ],
    ]),
    queue: [
      { elementId: 202, remaining: 5, secondsPerUnit: 1200 },
      { elementId: 203, remaining: 2, secondsPerUnit: 3000 },
    ],

    unitTiming: { durationSeconds: 1200, remainingSeconds: 900, progressPercent: 25 },
  })
})

void test('the defense catalogue is read from its own address', async () => {
  const document = await read(
    (session) => shipyardDefense(session, { planetId: PLANET_ID }),
    pageReply(gamePage(shipyardDefenseBody, { planetId: PLANET_ID, header: HEADER })),
  )
  assert.equal(document.catalogue, 'defense')
  assert.deepEqual([...document.inventory], [[401, 40]])
  assert.deepEqual(
    document.quotes,
    new Map([
      [
        401,
        {
          elementId: 401,
          costs: new Map([[901, 2000]]),
          durationSeconds: 30,
          maximumBuildable: 250,
        },
      ],
    ]),
  )
  assert.deepEqual(document.queue, [{ elementId: 401, remaining: 40, secondsPerUnit: 30 }])
  assert.deepEqual(document.unitTiming, {
    durationSeconds: 30,
    remainingSeconds: 30,
    progressPercent: 0,
  })
})

void test('the catalogue is read back from the address rather than from the markup', () => {
  const body = documentOf(shipyardPageBody)
  const fleet = readShipyard(parsePage(httpResponse({ body }, SHIPYARD_URL)))
  const defense = readShipyard(parsePage(httpResponse({ body }, DEFENSE_URL)))
  assert.equal(fleet.catalogue, 'fleet')
  assert.equal(defense.catalogue, 'defense')

  assert.deepEqual(defense.inventory, fleet.inventory)
  assert.deepEqual(defense.queue, fleet.queue)
  assert.deepEqual(defense.unitTiming, fleet.unitTiming)
})

void test('a reading of a page a template could not have rendered is a decoding failure', () => {
  const broken: [string, string, string][] = [
    ['an object stating an empty queue', shipyardEmptyQueueObjectBody, 'Invalid shipyard queue'],

    [
      'a queue entry that is not a unit tuple',
      shipyardShortQueueTupleBody,
      'Invalid shipyard queue item',
    ],
    [
      'a unit tuple whose amount is not a number',
      shipyardUnnamedQueueTupleBody,
      'Expected a numeric value',
    ],
    ['a queue without a list', QUEUE_WITHOUT_A_LIST, 'Invalid shipyard queue'],
    ['a queue whose entry is not a tuple', QUEUE_WITH_A_NON_TUPLE, 'Invalid shipyard queue item'],

    [
      'a box without its quantity cell',
      shipyardMissingInventoryCellBody,
      'Invalid shipyard inventory',
    ],
    ['two boxes naming one unit', shipyardRepeatedInventoryCellBody, 'Invalid shipyard inventory'],

    [
      'an inventory figure with no brackets',
      shipyardUnbracketedInventoryBody,
      'Invalid inventory quantity',
    ],
    [
      'an inventory figure with a bracket it never closes',
      INVENTORY_WITH_A_TRUNCATED_FIGURE,
      'Invalid inventory quantity',
    ],
    [
      'an inventory figure no formatter writes',
      shipyardUnformattedQuantityBody,
      'Invalid formatted quantity',
    ],

    ['no catalogue anchor', WITHOUT_A_CATALOGUE, 'Expected one #build_elements, found 0'],
  ]
  for (const [name, body, message] of broken)
    assert.throws(() => readShipyard(pageOf(body)), { code: ErrorCode.ParseError, message }, name)
})

void test('an empty queue list is no queue at all', () => {
  const document = readShipyard(pageOf(shipyardEmptyQueueBody))
  assert.deepEqual(document.queue, [])
  assert.deepEqual([...document.inventory], [])
  assert.deepEqual([...document.quotes], [])
  assert.equal(document.unitTiming, null)
  assert.equal(document.catalogue, 'fleet')
})

void test('the elapsed time counts into the head unit alone, and never past it', () => {
  const document = readShipyard(pageOf(shipyardElapsedBeyondUnitBody))
  assert.deepEqual(document.queue, [{ elementId: 202, remaining: 1, secondsPerUnit: 1200 }])
  assert.deepEqual(document.unitTiming, {
    durationSeconds: 1200,
    remainingSeconds: 0,
    progressPercent: 100,
  })
})

void test('a unit the page renders no duration for is complete at once', () => {
  const document = readShipyard(pageOf(shipyardZeroDurationBody))

  assert.deepEqual(document.unitTiming, {
    durationSeconds: 0,
    remainingSeconds: 0,
    progressPercent: 100,
  })
})

void test('the fleet catalogue and the queue’s commands are one address', async () => {
  const operations: [
    name: string,
    expected: { method: 'GET' | 'POST'; url: string; body?: [string, string][] },
    run: (session: Session) => Promise<unknown>,
  ][] = [
    [
      'the fleet catalogue',
      { method: 'GET', url: SHIPYARD_URL },
      (session) => shipyard(session, { planetId: PLANET_ID }),
    ],
    [
      'queueing units',
      {
        method: 'POST',
        url: SHIPYARD_URL,
        body: [
          ['fmenge[202]', '5'],
          ['fmenge[203]', '2'],
        ],
      },
      (session) =>
        shipyardProduce(session, {
          planetId: PLANET_ID,
          elements: new Map([
            [202, 5],
            [203, 2],
          ]),
        }),
    ],
    [
      'cancelling orders',
      {
        method: 'POST',
        url: SHIPYARD_URL,
        body: [
          ['action', 'delete'],
          ['auftr[]', '0'],
        ],
      },
      (session) => shipyardCancel(session, { planetId: PLANET_ID, queueIndexes: [0] }),
    ],
  ]
  const addresses: [string, string][] = []
  for (const [name, expected, run] of operations) {
    const server = await expectOperation(run, expected)
    addresses.push([name, server.requests[0]!.url.href])
  }
  for (const [name, address] of addresses) assert.equal(address, addresses[0]![1], name)

  const defense = await expectOperation(
    (session) => shipyardDefense(session, { planetId: PLANET_ID }),
    { url: DEFENSE_URL },
  )
  assert.equal(defense.requests[0]!.url.href, `${addresses[0]![1]}&mode=defense`)
})

void test('queueing units sends each element as its own field', async () => {
  await expectOperation(
    (session) =>
      shipyardProduce(session, {
        planetId: PLANET_ID,
        elements: new Map([
          [202, 5],
          [203, 2],
        ]),
      }),
    {
      method: 'POST',
      url: SHIPYARD_URL,

      body: [
        ['fmenge[202]', '5'],
        ['fmenge[203]', '2'],
      ],
    },
  )
})

void test('a single-entry selection is encoded as one form field', async () => {
  await expectOperation(
    (session) => shipyardProduce(session, { planetId: PLANET_ID, elements: new Map([[401, 40]]) }),
    { method: 'POST', url: SHIPYARD_URL, body: [['fmenge[401]', '40']] },
  )
})

void test('a selection naming no unit is a submission with no field', async () => {
  await expectOperation(
    (session) => shipyardProduce(session, { planetId: PLANET_ID, elements: new Map() }),
    { method: 'POST', url: SHIPYARD_URL, body: [] },
  )
})

void test('cancelling orders indexes the one queue from zero', async () => {
  await expectOperation(
    (session) => shipyardCancel(session, { planetId: PLANET_ID, queueIndexes: [0, 2] }),
    {
      method: 'POST',
      url: SHIPYARD_URL,

      body: [
        ['action', 'delete'],
        ['auftr[]', '0'],
        ['auftr[]', '2'],
      ],
    },
  )
})

void test('a deletion naming no order is still a deletion', async () => {
  await expectOperation(
    (session) => shipyardCancel(session, { planetId: PLANET_ID, queueIndexes: [] }),
    { method: 'POST', url: SHIPYARD_URL, body: [['action', 'delete']] },
  )
})

void test('a queue command the server refused is reported as the message it printed', async () => {
  const observed = await answer(
    (session) => shipyardProduce(session, { planetId: PLANET_ID, elements: new Map([[202, 5]]) }),
    pageReply(gamePage('<div class="ally_contents">Not enough metal</div>')),
  )
  assert.deepEqual(observed.data, { planetId: 1000, kind: 'message', message: 'Not enough metal' })
})

void test('unit quotes reject malformed external prices and quantities', () => {
  for (const [before, after] of [
    ['"901":2000', '"901":"invalid"'],
    ['"maxBuildable":"12"', '"maxBuildable":"invalid"'],
    ['"elementTime":1200', '"elementTime":-1'],
  ]) {
    assert.throws(() => readShipyard(pageOf(shipyardPageBody.replace(before!, after!))), {
      code: ErrorCode.ParseError,
    })
  }
})
