import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import {
  ErrorCode,
  parsePage,
  readReduceResources,
  reduceResources,
  reduceResourcesGather,
} from '../../../src/index.ts'
import {
  foreignPageForm,
  logisticsPageContent,
  resourceCells,
  row,
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

const PLAN_URL = `${BASE_URL}game.php?page=reduceResources&cp=${PLANET_ID}`
const GATHER_URL = `${BASE_URL}game.php?page=reduceResources&cp=${PLANET_ID}&mode=reduce`

function pageOf(content: string): Page {
  return parsePage(httpResponse({ body: content }, PLAN_URL))
}

void test('the plan is read row by row, with what each planet holds', async () => {
  const rows =
    row(1001, 'Nova', '[1:2:4]', '01:00:00', resourceCells('1.000', '500', '100')) +
    row(1002, 'Outpost', '[1:2:5]', '01:30:00', resourceCells('2.000', '800', '200'))
  const observed = await decode(
    (session) => reduceResources(session, { planetId: PLANET_ID }),
    pageReply(gamePage(logisticsPageContent('reduceResources', rows))),
  )
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'reduceResources',
    planetId: PLANET_ID,
    observedAtMs: observed.response.observedAtMs,
    candidates: [
      {
        planetId: 1001,
        name: 'Nova',
        coordinate: { galaxy: 1, system: 2, planet: 4 },
        travelTimeText: '01:00:00',

        resourceTexts: ['1.000', '500', '100'],
      },
      {
        planetId: 1002,
        name: 'Outpost',
        coordinate: { galaxy: 1, system: 2, planet: 5 },
        travelTimeText: '01:30:00',
        resourceTexts: ['2.000', '800', '200'],
      },
    ],
  })
})

void test('a row that rendered no coordinate states none', () => {
  const rows = row(1001, 'Nova', '', '01:00:00', resourceCells('1.000', '500', '100'))
  const document = readReduceResources(
    pageOf(gamePage(logisticsPageContent('reduceResources', rows))),
  )
  assert.deepEqual(document.candidates, [
    {
      planetId: 1001,
      name: 'Nova',
      coordinate: null,
      travelTimeText: '01:00:00',
      resourceTexts: ['1.000', '500', '100'],
    },
  ])
})

void test('a row the page refuses to gather from is not a destination', () => {
  const selectable = row(1001, 'Nova', '[1:2:4]', '01:00:00', resourceCells('1.000', '500', '100'))
  const refused = selectable.replace(' name="palanets[]"', '')
  const document = readReduceResources(
    pageOf(gamePage(logisticsPageContent('reduceResources', refused))),
  )
  assert.deepEqual(document.candidates, [])
})

void test('a plan the page refused to draw is an empty plan rather than a failure', () => {
  const document = readReduceResources(
    pageOf(gamePage(logisticsPageContent('reduceResources', ''))),
  )
  assert.deepEqual(document.candidates, [])
})

void test('a response from another page is refused', () => {
  assert.throws(() => readReduceResources(pageOf(gamePage(foreignPageForm))), {
    code: ErrorCode.ParseError,
    message: 'Missing or ambiguous reduceResources form',
  })
})

void test('reading the plan asks the page’s own address', async () => {
  await expectOperation((session) => reduceResources(session, { planetId: PLANET_ID }), {
    url: PLAN_URL,
  })
})

void test('gathering sends the freighters to every named planet', async () => {
  await expectOperation(
    (session) =>
      reduceResourcesGather(session, {
        origin: { planetId: PLANET_ID },
        targets: [{ planetId: 1001 }, { planetId: 1002 }],
      }),
    {
      method: 'POST',

      url: GATHER_URL,
      body: [
        ['palanets[]', '1001'],
        ['palanets[]', '1002'],
      ],
    },
  )
})

void test('a gathering the endpoint served is reported as its message', async () => {
  const observed = await decode(
    (session) =>
      reduceResourcesGather(session, {
        origin: { planetId: PLANET_ID },
        targets: [{ planetId: 1001 }],
      }),
    pageReply(gamePage('<div class="ally_contents">Freighters sent</div>')),
  )
  assert.deepEqual(observed.data, { planetId: 1000, kind: 'message', message: 'Freighters sent' })
})
