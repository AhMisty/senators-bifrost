import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../src/index.ts'
import { ErrorCode, fleetEvents, numericMap, parsePage, slots, unitRows } from '../../src/index.ts'
import {
  fleetTableBody,
  phalanxEventLog,
  phalanxEventWithoutStateLog,
} from '../fixtures/game/space.ts'
import {
  countHiddenUnitTooltip,
  eventWithAmbiguousCargoTooltips,
  eventWithAmbiguousUnitTooltips,
  eventWithEmptyUnitTooltip,
  eventWithForeignCargoRow,
  eventWithMissileState,
  eventWithMissionLabel,
  eventWithoutAddress,
  eventWithoutMissionClass,
  eventWithStates,
  eventWithUnreadableWording,
  eventWithTwoStates,
  eventWithUnitTooltip,
  fleetSlotLine,
  fleetSlotLineWithoutCounts,
  fleetSlotLineWithoutExpeditions,
  stateSpan,
  twoEvents,
} from '../fixtures/shared/fleetEvents.ts'
import { BASE_URL, PLANET_ID, httpResponse } from '../helpers.ts'

const GAME_URL = `${BASE_URL}game.php?page=overview&cp=${PLANET_ID}`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body }, GAME_URL))
}

void test('an event is read from the timer and the wording that describes it', () => {
  assert.deepEqual(fleetEvents(pageOf(phalanxEventLog)), [
    {
      occursAtMs: 1767225600000,
      remainingSeconds: 300,
      state: 'flight',
      mission: 1,
      missionText: 'Attack',
      isOwn: true,
      text: 'One of your Fleets from Planet Homeworld [1:2:3] reached the Planet Nova [1:2:4]. Mission: Attack',
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
    },
  ])
})

void test('the mission the wording names is read from the anchor that carries it', () => {
  const event = fleetEvents(pageOf(eventWithMissionLabel))[0]!
  assert.equal(event.missionText, 'Attack')
  assert.equal(event.mission, 1)
  assert.equal(event.isOwn, false)
  assert.deepEqual(event.cargo, new Map([[901, 1000]]))
})

void test('an event that carries no cargo has its mission read from the clause it ends on', () => {
  const event = fleetEvents(pageOf(eventWithoutMissionClass))[0]!
  assert.equal(event.missionText, 'Deploy')
  assert.deepEqual(event.cargo, null)

  assert.equal(event.mission, null)
  assert.equal(event.isOwn, null)
})

void test('a state class naming a member of Object.prototype is not a mission', () => {
  for (const name of ['constructor', 'toString', 'hasOwnProperty']) {
    const event = fleetEvents(
      pageOf(eventWithStates(stateSpan(`flight ${name}`, 'Deploying.'))),
    )[0]!
    assert.equal(event.mission, null, name)
    assert.equal(event.isOwn, null, name)
    assert.equal(event.state, 'flight', name)
  }
})

void test('an event whose wording states no mission reports none', () => {
  const event = fleetEvents(pageOf(eventWithoutAddress))[0]!
  assert.equal(event.missionText, null)
  assert.deepEqual(event.addresses, [])
  assert.equal(event.text, 'Deploying.')
})

void test('a wording that names no mission in either place reports none', () => {
  const event = fleetEvents(pageOf(eventWithUnreadableWording))[0]!

  assert.deepEqual(event.cargo, new Map([[901, 5]]))

  assert.deepEqual(event.addresses, [])

  assert.equal(event.missionText, 'Espionage')
})

void test('the units an event carries are read from the tooltip its amount anchors', () => {
  const event = fleetEvents(pageOf(eventWithUnitTooltip))[0]!
  assert.deepEqual(event.units, [
    { elementId: 202, name: 'Small Cargo', amount: 10 },
    { elementId: 210, name: 'Recycler', amount: 2 },
  ])

  assert.equal(event.missionText, 'Deploy')
})

void test('a tooltip that lists no unit states none rather than an empty list', () => {
  const event = fleetEvents(pageOf(eventWithEmptyUnitTooltip))[0]!
  assert.equal(event.units, null)
})

void test('a second tooltip of either kind leaves the event undecided', () => {
  assert.throws(() => fleetEvents(pageOf(eventWithAmbiguousUnitTooltips)), {
    code: ErrorCode.ParseError,
    message: /Ambiguous fleet unit tooltip/,
  })
  assert.throws(() => fleetEvents(pageOf(eventWithAmbiguousCargoTooltips)), {
    code: ErrorCode.ParseError,
    message: /Ambiguous fleet cargo tooltip/,
  })
})

void test('a cargo tooltip reports the elements its rows name, and skips the summary rows', () => {
  const event = fleetEvents(pageOf(eventWithForeignCargoRow))[0]!
  assert.deepEqual(event.cargo, new Map([[901, 2000]]))
  assert.equal(event.missionText, 'Transfer')
})

void test('a text block that describes two fleets states two events', () => {
  const events = fleetEvents(pageOf(eventWithTwoStates))
  assert.deepEqual(
    events.map((event) => event.state),
    ['flight', 'return'],
  )

  assert.deepEqual(
    events.map((event) => event.occursAtMs),
    [1767225600000, 1767225600000],
  )
})

void test('a missile event names the mission the fleet table writes and FleetMission does not', () => {
  const event = fleetEvents(pageOf(eventWithMissileState))[0]!
  assert.equal(event.mission, 10)
  assert.equal(event.isOwn, true)
})

void test('a log of several events is read in document order', () => {
  const events = fleetEvents(pageOf(twoEvents))
  assert.deepEqual(
    events.map((event) => [event.remainingSeconds, event.state, event.missionText]),
    [
      [300, 'flight', 'Attack'],
      [300, 'holding', 'Hold'],
    ],
  )
})

void test('a timer whose text block names no state is not an event', () => {
  assert.throws(() => fleetEvents(pageOf(phalanxEventWithoutStateLog)), {
    code: ErrorCode.ParseError,
    message: /Missing fleet event state/,
  })
})

void test('a page that lists no event reports none', () => {
  assert.deepEqual(fleetEvents(pageOf('<div class="fleet_log"></div>')), [])
})

void test('the slots a header prints are read as the pairs it renders', () => {
  assert.deepEqual(slots(pageOf(fleetSlotLine)), {
    fleetSlots: { used: 2, total: 5 },
    expeditionSlots: { used: 0, total: 1 },
  })

  assert.deepEqual(slots(pageOf(fleetSlotLineWithoutExpeditions)), {
    fleetSlots: { used: 2, total: 5 },
    expeditionSlots: null,
  })

  assert.deepEqual(slots(pageOf(fleetSlotLineWithoutCounts)), {
    fleetSlots: null,
    expeditionSlots: null,
  })
})

void test('the slot pairs are the ones the fleet table itself prints', () => {
  assert.deepEqual(slots(pageOf(fleetTableBody)), {
    fleetSlots: { used: 2, total: 5 },
    expeditionSlots: { used: 0, total: 1 },
  })
})

void test('a script value the server wrote as counts is read as a map of them', () => {
  assert.deepEqual(
    numericMap({ 901: '1000', 902: '500' }),
    new Map([
      [901, 1000],
      [902, 500],
    ]),
  )
  assert.deepEqual(numericMap({}), new Map())

  assert.throws(() => numericMap(undefined), {
    code: ErrorCode.ParseError,
    message: 'Expected static object',
  })
  assert.throws(() => numericMap(['1000']), {
    code: ErrorCode.ParseError,
    message: 'Expected static object',
  })
})

void test('a unit row reports the element its icon shows and the count it displays', () => {
  assert.deepEqual(unitRows(pageOf(countHiddenUnitTooltip)), [
    { elementId: null, name: 'Small Cargo', amount: null },
    { elementId: null, name: 'Recycler', amount: null },
  ])
})

void test('a unit row that displays its count names the element its icon shows', () => {
  const rows = unitRows(
    pageOf(
      [
        '<table>',
        "<tr><td><img src='styles/theme/nsc/gebaeude/202.gif'></td>",
        "<td class='reducefleet_name_ship'>Small Cargo: <span class='reducefleet_count_ship'>10</span></td></tr>",
        '</table>',
      ].join(''),
    ),
  )
  assert.deepEqual(rows, [{ elementId: 202, name: 'Small Cargo', amount: 10 }])
})

void test('a row that names no element reports none rather than refusing', () => {
  const rows = unitRows(
    pageOf(
      [
        '<table>',
        '<tr><td>summary</td></tr>',
        "<tr><td><img src='styles/theme/nsc/gebaeude/ship.gif'></td>",
        "<td>Unknown: <span class='reducefleet_count_ship'>1</span></td></tr>",
        '<tr></tr>',
        '</table>',
      ].join(''),
    ),
  )

  assert.deepEqual(rows, [{ elementId: null, name: 'Unknown', amount: 1 }])
})

void test('the first row of a count-hidden table is the summary, not a unit', () => {
  assert.deepEqual(
    unitRows(pageOf("<table class='reducefleet_table'><tr><td>Total:</td></tr></table>")),
    [],
  )
})
