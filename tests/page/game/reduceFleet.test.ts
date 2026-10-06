import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import {
  ErrorCode,
  parsePage,
  readReduceFleet,
  reduceFleet,
  reduceFleetGather,
} from '../../../src/index.ts'
import {
  emptyFleetCell,
  fleetCellTooltipWithoutTable,
  fleetTooltip,
  fleetTooltipCell,
  foreignPageForm,
  logisticsPageContent,
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

const PLAN_URL = `${BASE_URL}game.php?page=reduceFleet&cp=${PLANET_ID}`
const GATHER_URL = `${BASE_URL}game.php?page=reduceFleet&cp=${PLANET_ID}&mode=reduce`

function pageOf(content: string): Page {
  return parsePage(httpResponse({ body: content }, PLAN_URL))
}

function rowWithFleet(id: number, name: string, ships: [number, number][]): string {
  return row(id, name, `[1:2:${id}]`, '01:00:00', fleetTooltipCell(fleetTooltip(ships)))
}

void test('the plan is read row by row, with the fleet each row holds', async () => {
  const content = gamePage(
    logisticsPageContent(
      'reduceFleet',
      rowWithFleet(1001, 'Nova', [
        [202, 10],
        [210, 2],
      ]) + rowWithFleet(1002, 'Outpost', [[203, 4]]),
    ),
  )
  const observed = await decode(
    (session) => reduceFleet(session, { planetId: PLANET_ID }),
    pageReply(content),
  )
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'reduceFleet',
    planetId: PLANET_ID,
    observedAtMs: observed.response.observedAtMs,
    candidates: [
      {
        planetId: 1001,
        name: 'Nova',
        coordinate: { galaxy: 1, system: 2, planet: 1001 },
        travelTimeText: '01:00:00',

        ships: new Map([
          [202, 10],
          [210, 2],
        ]),
      },
      {
        planetId: 1002,
        name: 'Outpost',
        coordinate: { galaxy: 1, system: 2, planet: 1002 },
        travelTimeText: '01:00:00',
        ships: new Map([[203, 4]]),
      },
    ],
  })
})

void test('a row that lists no fleet states none rather than an empty one', () => {
  const content = gamePage(
    logisticsPageContent('reduceFleet', row(1001, 'Nova', '[1:2:4]', '01:00:00', emptyFleetCell)),
  )
  const document = readReduceFleet(pageOf(content))
  assert.equal(document.candidates[0]!.ships, null)
})

void test('a fleet the row states but the reader cannot read is a decoding failure', () => {
  const withoutTable = gamePage(
    logisticsPageContent(
      'reduceFleet',
      row(1001, 'Nova', '[1:2:4]', '01:00:00', fleetCellTooltipWithoutTable),
    ),
  )
  assert.throws(() => readReduceFleet(pageOf(withoutTable)), {
    code: ErrorCode.ParseError,
    message: 'Missing logistics fleet table',
  })
})

void test('a fleet table whose rows name no element is refused', () => {
  const incomplete = fleetTooltipCell(
    "<table class='reducefleet_table'><tr><td class='reducefleet_name_ship'>Ship: <span class='reducefleet_count_ship'>5</span></td></tr></table>",
  )
  const content = gamePage(
    logisticsPageContent('reduceFleet', row(1001, 'Nova', '[1:2:4]', '01:00:00', incomplete)),
  )
  assert.throws(() => readReduceFleet(pageOf(content)), {
    code: ErrorCode.ParseError,
    message: 'Incomplete logistics fleet entry',
  })
})

void test('one element listed twice leaves the fleet it flies undecided', () => {
  const duplicated = gamePage(
    logisticsPageContent(
      'reduceFleet',
      rowWithFleet(1001, 'Nova', [
        [202, 10],
        [202, 2],
      ]),
    ),
  )
  assert.throws(() => readReduceFleet(pageOf(duplicated)), {
    code: ErrorCode.ParseError,
    message: 'Duplicate logistics fleet entry',
  })
})

void test('a plan the page refused to draw is an empty plan rather than a failure', () => {
  const content = gamePage(logisticsPageContent('reduceFleet', ''))
  assert.deepEqual(readReduceFleet(pageOf(content)).candidates, [])
})

void test('a response from another page is refused', () => {
  assert.throws(() => readReduceFleet(pageOf(gamePage(foreignPageForm))), {
    code: ErrorCode.ParseError,
    message: 'Missing or ambiguous reduceFleet form',
  })
})

void test('the speed the times are rendered for travels only where the caller names one', async () => {
  await expectOperation((session) => reduceFleet(session, { planetId: PLANET_ID }), {
    url: PLAN_URL,
  })
  await expectOperation((session) => reduceFleet(session, { planetId: PLANET_ID, speed: 5 }), {
    url: `${BASE_URL}game.php?speed=5&page=reduceFleet&cp=${PLANET_ID}`,
  })
})

void test('gathering flies one fleet from every named planet to the request’s own', async () => {
  await expectOperation(
    (session) =>
      reduceFleetGather(session, {
        origin: { planetId: PLANET_ID },
        speed: 5,
        targets: [{ planetId: 1001 }, { planetId: 1002 }],
      }),
    {
      method: 'POST',
      url: GATHER_URL,
      body: [
        ['speed', '5'],
        ['palanets[]', '1001'],
        ['palanets[]', '1002'],
      ],
    },
  )
})

void test('a gathering the endpoint served is reported as its message', async () => {
  const observed = await decode(
    (session) =>
      reduceFleetGather(session, {
        origin: { planetId: PLANET_ID },
        speed: 10,
        targets: [{ planetId: 1001 }],
      }),
    pageReply(gamePage('<div class="ally_contents">Fleets gathered</div>')),
  )
  assert.deepEqual(observed.data, { planetId: 1000, kind: 'message', message: 'Fleets gathered' })
})
