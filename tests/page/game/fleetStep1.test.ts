import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Location, Page } from '../../../src/index.ts'
import {
  ErrorCode,
  fleetStep1,
  fleetStep1CheckTarget,
  fleetStep1DeleteShortcuts,
  fleetStep1SaveShortcuts,
  parsePage,
  readFleetOptions,
  readFleetSpeed,
  readFleetMission,
  readInteger,
  readFleetStep1,
} from '../../../src/index.ts'
import {
  DRAFT_FIGURES,
  fleetStep1WithDuplicateACSGroup,
  fleetStep1WithNamelessShortcutRow,
  fleetStep1WithTruncatedACSTarget,
  fleetStep1WithTruncatedColonyTarget,
  fleetStep1WithTypedACSTargets,
} from '../../fixtures/game/fleet.ts'
import {
  fleetStep1FormOnlyBody,
  fleetStep1InvalidOriginBody,
  fleetStep1PreviewBody,
  fleetStep1ShortcutsBody,
} from '../../fixtures/game/space.ts'
import {
  BASE_URL,
  PLANET_ID,
  answer,
  expectOperation,
  gamePage,
  httpResponse,
  pageReply,
  read,
} from '../../helpers.ts'

const STEP1_URL = `${BASE_URL}game.php?page=fleetStep1&cp=${PLANET_ID}`

function pageOf(content: string): Page {
  return parsePage(httpResponse({ body: gamePage(content) }, STEP1_URL))
}

function withDraftFigures(body: string): string {
  return body.replace('ships: {}};', `ships: {}, ${DRAFT_FIGURES}};`)
}

const TARGET: Location = { galaxy: 1, system: 2, planet: 4, type: 3 }

void test('the destination form is read from the binding the template writes below it', () => {
  assert.deepEqual(readFleetStep1(pageOf(fleetStep1PreviewBody)), {
    kind: 'fleetStep1',
    planetId: PLANET_ID,
    observedAtMs: 1,
    token: 'tok-1',
    origin: { galaxy: 1, system: 2, planet: 3, type: 1 },
    ships: new Map([
      [202, { amount: 5, speed: 5000, consumption: 20 }],
      [203, { amount: 2, speed: 4000, consumption: 50 }],
    ]),
    capacity: 1000,
    flightPreview: {
      fleetSpeedFactor: 4,
      minimumFleetSeconds: 5,
      maximumFleetSpeed: 4000,
    },
    speedOptions: [
      { value: 10, label: '100%', disabled: false, selected: true },
      { value: 5, label: '50%', disabled: false, selected: false },
    ],
    targetTypes: [
      { value: 1, label: 'Planet', disabled: false, selected: true },
      { value: 3, label: 'Moon', disabled: true, selected: false },
      { value: 2, label: 'Debris', disabled: false, selected: false },
    ],

    colonies: [],

    shortcuts: [],

    acsTargets: new Map([[9, { galaxy: 1, system: 2, planet: 4, type: 1 }]]),
  })
})

void test('a saved shortcut is read from its own id and the coordinate fields beside it', () => {
  const document = readFleetStep1(pageOf(withDraftFigures(fleetStep1ShortcutsBody)))
  assert.deepEqual(document.shortcuts, [
    {
      id: 7,
      name: 'Home',
      target: { galaxy: 1, system: 2, planet: 3, type: 1 },
    },
  ])

  assert.deepEqual(document.colonies, [
    { galaxy: 1, system: 2, planet: 3, type: 1 },
    { galaxy: 1, system: 2, planet: 4, type: 3 },
  ])

  assert.deepEqual(document.origin, { galaxy: 1, system: 2, planet: 3, type: 1 })
  assert.deepEqual(document.ships, new Map())
  assert.deepEqual(document.flightPreview, {
    fleetSpeedFactor: 4,
    minimumFleetSeconds: 5,
    maximumFleetSpeed: 4000,
  })
})

void test('a shortcut row whose name field states no value is a decoding failure', () => {
  assert.throws(() => readFleetStep1(pageOf(fleetStep1WithNamelessShortcutRow)), {
    code: ErrorCode.ParseError,
    message: 'Missing value on the selected element',
  })
})

void test('each ACS anchor states its own location type', () => {
  const document = readFleetStep1(pageOf(fleetStep1WithTypedACSTargets))
  assert.deepEqual(
    [...document.acsTargets],
    [
      [7, { galaxy: 1, system: 2, planet: 4, type: 2 }],
      [8, { galaxy: 1, system: 2, planet: 5, type: 3 }],
    ],
  )
})

void test('a document that cannot be read is a decoding failure, not a refusal', () => {
  const broken: [string, string, string][] = [
    ['no data binding', fleetStep1FormOnlyBody, 'Expected at least one data binding, found 0'],
    [
      'an origin type the game does not address',
      withDraftFigures(fleetStep1InvalidOriginBody),
      'Unknown target type',
    ],
    ['a truncated colony call', fleetStep1WithTruncatedColonyTarget, 'Invalid colony target'],
    ['a truncated ACS call', fleetStep1WithTruncatedACSTarget, 'Invalid ACS target'],
    ['two anchors claiming one group', fleetStep1WithDuplicateACSGroup, 'Ambiguous ACS group'],
  ]
  for (const [name, body, message] of broken)
    assert.throws(() => readFleetStep1(pageOf(body)), { code: ErrorCode.ParseError, message }, name)
})

void test('the options one form offers are read from a select or from a radio group', () => {
  const page = pageOf(
    [
      '<select name="speed"><option value="10">100%</option></select>',

      '<input type="radio" name="mission" value="1" checked="checked">',
      '<label for="radio_3">Transport</label>',
      '<input type="radio" id="radio_3" name="mission" value="3">',
      '<label for="radio_4">Recycle</label>',
      '<input type="radio" id="radio_5" name="mission" value="5" disabled="disabled">',
      '<input type="radio" name="mission" value="7">',
    ].join(''),
  )
  assert.deepEqual(readFleetOptions(page, 'speed', readFleetSpeed), [
    { value: 10, label: '100%', disabled: false, selected: true },
  ])
  assert.deepEqual(readFleetOptions(page, 'mission', readFleetMission), [
    { value: 1, label: '', disabled: false, selected: true },
    { value: 3, label: 'Transport', disabled: false, selected: false },

    { value: 5, label: '', disabled: true, selected: false },
    { value: 7, label: '', disabled: false, selected: false },
  ])

  assert.deepEqual(
    readFleetOptions(page, 'staytime', (value) => readInteger(value, 1)),
    [],
  )
})

void test('opening a draft posts the ship selection and reads the destination form back', async () => {
  const server = await expectOperation(
    (session) =>
      fleetStep1(session, { origin: { planetId: PLANET_ID }, ships: new Map([[202, 5]]) }),
    {
      method: 'POST',
      url: STEP1_URL,
      body: [['ship202', '5']],
    },
    pageReply(gamePage(fleetStep1PreviewBody)),
  )

  assert.equal(server.requests[0]!.headers['Content-Type'], 'application/x-www-form-urlencoded')
})

void test('checking a target asks the endpoint the form’s own script asks', async () => {
  await expectOperation(
    (session) =>
      fleetStep1CheckTarget(session, { origin: { planetId: PLANET_ID }, target: TARGET }),
    {
      url: `${BASE_URL}game.php?galaxy=1&system=2&planet=4&planet_type=3&page=fleetStep1&cp=${PLANET_ID}&mode=checkTarget`,
    },
  )
})

void test('a target the endpoint accepts is reported as the text it answered with', async () => {
  const observed = await answer(
    (session) =>
      fleetStep1CheckTarget(session, { origin: { planetId: PLANET_ID }, target: TARGET }),
    { body: 'OK' },
  )
  assert.deepEqual(observed.data, { kind: 'text', text: 'OK' })
})

void test('a target the endpoint refuses is reported as the reason it printed', async () => {
  const observed = await answer(
    (session) =>
      fleetStep1CheckTarget(session, { origin: { planetId: PLANET_ID }, target: TARGET }),
    { body: 'You cannot fly to your own planet' },
  )
  assert.deepEqual(observed.data, {
    kind: 'text',
    text: 'You cannot fly to your own planet',
  })
})

void test('saving shortcuts submits every row in one request', async () => {
  await expectOperation(
    (session) =>
      fleetStep1SaveShortcuts(session, {
        shortcuts: [
          { name: 'Home', target: { galaxy: 1, system: 2, planet: 3, type: 1 } },
          { id: 7, name: 'Wreck', target: { galaxy: 4, system: 5, planet: 6, type: 2 } },
        ],
      }),
    {
      method: 'POST',
      url: `${BASE_URL}game.php?ajax=1&page=fleetStep1&mode=saveShortcuts`,

      body: [
        ['shortcut[new_0][name]', 'Home'],
        ['shortcut[new_0][galaxy]', '1'],
        ['shortcut[new_0][system]', '2'],
        ['shortcut[new_0][planet]', '3'],
        ['shortcut[new_0][type]', '1'],
        ['shortcut[7][name]', 'Wreck'],
        ['shortcut[7][galaxy]', '4'],
        ['shortcut[7][system]', '5'],
        ['shortcut[7][planet]', '6'],
        ['shortcut[7][type]', '2'],
      ],
    },
  )
})

void test('a name is sent exactly as the caller wrote it', async () => {
  await expectOperation(
    (session) =>
      fleetStep1SaveShortcuts(session, {
        shortcuts: [{ id: 1, name: '<b>Raid</b>', target: TARGET }],
      }),
    {
      method: 'POST',
      url: `${BASE_URL}game.php?ajax=1&page=fleetStep1&mode=saveShortcuts`,
      body: [
        ['shortcut[1][name]', '<b>Raid</b>'],
        ['shortcut[1][galaxy]', '1'],
        ['shortcut[1][system]', '2'],
        ['shortcut[1][planet]', '4'],
        ['shortcut[1][type]', '3'],
      ],
    },
  )
})

void test('a shortcut the endpoint saved is answered with the message it printed', async () => {
  const observed = await answer(
    (session) =>
      fleetStep1SaveShortcuts(session, {
        shortcuts: [{ name: 'Home', target: TARGET }],
      }),
    { body: '"Shortcuts saved"' },
  )
  assert.deepEqual(observed.data, { kind: 'json', value: 'Shortcuts saved' })
})

void test('deleting shortcuts submits one empty-named row per id', async () => {
  await expectOperation((session) => fleetStep1DeleteShortcuts(session, { ids: [7, 9] }), {
    method: 'POST',

    url: `${BASE_URL}game.php?ajax=1&page=fleetStep1&mode=saveShortcuts`,
    body: [
      ['shortcut[7][name]', ''],
      ['shortcut[9][name]', ''],
    ],
  })
})

void test('saving a preset posts the name beside the ships to the form that stores it', async () => {
  await expectOperation(
    (session) =>
      fleetStep1(session, {
        origin: { planetId: PLANET_ID },
        presetName: 'Raid',
        ships: new Map([
          [202, 5],
          [203, 2],
        ]),
      }),
    {
      method: 'POST',

      url: STEP1_URL,
      body: [
        ['ship202', '5'],
        ['ship203', '2'],
        ['save_groop', 'Raid'],
      ],
    },
  )
})

void test('the answer to a preset save is the draft the form renders, not a receipt', async () => {
  const observed = await answer(
    (session) =>
      fleetStep1(session, {
        origin: { planetId: PLANET_ID },
        presetName: 'Raid',
        ships: new Map([[202, 1]]),
      }),
    pageReply(gamePage(fleetStep1PreviewBody)),
  )
  const data = observed.data
  if (data.kind !== 'fleetStep1')
    assert.fail(`expected the destination form, answered with ${data.kind}`)

  assert.equal(data.token, 'tok-1')
  assert.deepEqual(
    data.ships,
    new Map([
      [202, { amount: 5, speed: 5000, consumption: 20 }],
      [203, { amount: 2, speed: 4000, consumption: 50 }],
    ]),
  )
})

void test('the endpoint reports a refusal to the form as the message page it rendered', async () => {
  const observed = await answer(
    (session) =>
      fleetStep1(session, {
        origin: { planetId: PLANET_ID },
        presetName: 'Raid',
        ships: new Map([[202, 1]]),
      }),
    pageReply(gamePage('<div class="ally_contents">Too many presets</div>')),
  )
  assert.deepEqual(observed.data, { planetId: 1000, kind: 'message', message: 'Too many presets' })
})

void test('opening a draft decodes the document it was answered with', async () => {
  const document = await read(
    (session) =>
      fleetStep1(session, { origin: { planetId: PLANET_ID }, ships: new Map([[202, 1]]) }),
    pageReply(gamePage(withDraftFigures(fleetStep1ShortcutsBody))),
  )
  assert.equal(document.kind, 'fleetStep1')
  assert.equal(document.token, 'tok-1')
})
