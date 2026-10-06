import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page, Session } from '../../../src/index.ts'
import {
  ErrorCode,
  fleetTable,
  fleetTableDeletePreset,
  fleetTableInviteACS,
  fleetTableOpenACS,
  fleetTableRecall,
  fleetTableRenameACS,
  parsePage,
  readFleetTable,
  readFleetACS,
} from '../../../src/index.ts'
import {
  acsForm,
  fleetTableAcsRowBody,
  fleetTableBody,
  fleetTableDeployedRowBody,
  fleetTableIncompleteRowBody,
  fleetTablePresetLinkWithoutIndexBody,
  fleetTablePresetListNonArrayBody,
  fleetTableRowsBody,
  fleetTableStateLinkTextBody,
} from '../../fixtures/game/space.ts'
import {
  BASE_URL,
  PLANET_ID,
  decode,
  expectOperation,
  fakeServer,
  gamePage,
  httpResponse,
  pageReply,
  sessionOn,
} from '../../helpers.ts'

const TABLE_URL = `${BASE_URL}game.php?page=fleetTable&cp=${PLANET_ID}`

const GROUP_URL = `${BASE_URL}game.php?action=acs&page=fleetTable`

type Run = (session: Session) => Promise<unknown>

function pageOf(content: string): Page {
  return parsePage(httpResponse({ body: gamePage(content) }, TABLE_URL))
}

function panelDocument(panel: string): string {
  return `<form action="game.php?page=fleetStep1" method="post"></form>${panel}`
}

void test('an ACS result contains its addressed group and rejects unrelated documents', () => {
  const page = readFleetACS(pageOf(acsForm(55, 'Raid')))
  assert.deepEqual(page, {
    kind: 'fleetACS',
    observedAtMs: 1,
    acs: {
      mainFleetId: 55,
      name: 'Raid',
      invitedUsers: [
        { id: 4242, name: 'AhMisty' },
        { id: 4243, name: 'Nova' },
      ],
      statusMessage: null,
    },
  })
  assert.throws(() => readFleetACS(pageOf('<p>No group</p>')), {
    code: ErrorCode.ParseError,
    message: 'Expected one form[action*="fleetStep1"], found 0',
  })
})
void test('the whole table is one document, read from one response', async () => {
  const server = fakeServer(pageReply(gamePage(fleetTableBody)))
  const observed = await fleetTable(sessionOn(server), { planetId: PLANET_ID })

  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.url.href, TABLE_URL)
  const table = observed.data
  if (table.kind !== 'fleetTable') assert.fail(`answered with the ${table.kind} receipt`)
  assert.equal(table.planetId, PLANET_ID)

  assert.deepEqual(table.fleetSlots, { used: 2, total: 5 })
  assert.deepEqual(table.expeditionSlots, { used: 0, total: 1 })

  assert.deepEqual(table.presets, [
    {
      index: 0,
      name: 'Raid',
      ships: new Map([
        [202, 5],
        [203, 2],
      ]),
    },
  ])

  assert.deepEqual(table.availableShips, new Map([[202, 10]]))
})

void test('the flying fleets are read row by row, each with its own controls', () => {
  const table = readFleetTable(pageOf(fleetTableBody))
  assert.deepEqual(table.fleets, [
    {
      id: 55,
      missionText: 'Transport',

      stateText: 'On the way',
      origin: { galaxy: 1, system: 2, planet: 3 },
      target: { galaxy: 1, system: 2, planet: 4 },

      departureText: '01.01.2026 12:00:00',
      arrivalText: '01.01.2026 13:00:00',
      countdownText: '0:59:59',
      amount: 10,

      units: [],
      hasRecallControl: true,
      hasACSControl: true,
    },
    {
      id: null,
      missionText: 'Deploy',
      stateText: 'Returning',
      origin: { galaxy: 1, system: 2, planet: 3 },
      target: { galaxy: 1, system: 2, planet: 5 },
      departureText: '01.01.2026 10:00:00',

      arrivalText: null,
      countdownText: null,
      amount: 5,
      units: [],
      hasRecallControl: false,
      hasACSControl: false,
    },
  ])
})

void test('a deployed record states neither an arrival nor a countdown', () => {
  const entry = readFleetTable(pageOf(fleetTableDeployedRowBody)).fleets[0]!
  assert.deepEqual(entry, {
    id: null,
    missionText: 'Deploy',
    stateText: 'Returning',
    origin: { galaxy: 1, system: 2, planet: 3 },
    target: { galaxy: 1, system: 2, planet: 5 },
    departureText: '01.01.2026 10:00:00',
    arrivalText: null,
    countdownText: null,
    amount: 5,
    units: [],
    hasRecallControl: false,
    hasACSControl: false,
  })
})

void test('a record whose fleet id only the ACS control names is still attributed', () => {
  const entry = readFleetTable(pageOf(fleetTableRowsBody)).fleets[0]!
  assert.equal(entry.id, 55)
  assert.equal(entry.hasRecallControl, false)
  assert.equal(entry.hasACSControl, true)
})

void test('a state link without its title is a parse failure', () => {
  assert.throws(() => readFleetTable(pageOf(fleetTableStateLinkTextBody)), {
    code: ErrorCode.ParseError,
  })
})

void test('the amount tooltip lists one unit per two-cell row', () => {
  const amount =
    '<td><a class="tooltip" data-tooltip-content="<table><tr><td>Small Cargo</td><td>10</td></tr>' +
    '<tr><td>Recycler:</td><td>2</td></tr><tr><td>Other</td><td>3</td><td>extra</td></tr></table>">15</a></td>'
  const row = [
    '<td>1</td>',
    '<td>Transport<br><a title="On the way">A</a></td>',
    amount,
    '<td>[1:2:3]</td>',
    '<td>01.01.2026 12:00:00</td>',
    '<td>[1:2:4]</td>',
    '<td>01.01.2026 13:00:00</td>',
    '<td>0:59:59</td>',
    '<td><form action="game.php?page=fleetTable&amp;action=sendfleetback"><input name="fleetID" value="55"><input type="submit" value="Send back"></form></td>',
  ].join('')
  const table = readFleetTable(
    pageOf(
      `<form action="game.php?page=fleetStep1" method="post"></form><table class="ally_ranks"><tr>${row}</tr></table>`,
    ),
  )
  assert.deepEqual(table.fleets[0]!.units, [
    { elementId: null, name: 'Small Cargo', amount: 10 },

    { elementId: null, name: 'Recycler', amount: 2 },
  ])
})

void test('the rows that are not records are told apart by their own shape', () => {
  const table = readFleetTable(pageOf(fleetTableRowsBody))
  assert.equal(table.fleets.length, 1)

  assert.deepEqual(table.availableShips, new Map())
  assert.deepEqual(table.presets, [{ index: 0, name: 'Raid', ships: new Map() }])
})

void test('the rows the page refused to draw are decoding failures', () => {
  const broken: [string, string, string][] = [
    ['a record that lost its cells', fleetTableIncompleteRowBody, 'Incomplete fleet table row'],
    [
      'a preset whose ships are not a list',
      fleetTablePresetListNonArrayBody,
      'Invalid fleet preset data',
    ],

    [
      'a preset link that names no position',
      fleetTablePresetLinkWithoutIndexBody,
      'Missing onclick on the selected element',
    ],
  ]
  for (const [name, body, message] of broken)
    assert.throws(() => readFleetTable(pageOf(body)), { code: ErrorCode.ParseError, message }, name)
})

void test('two ship fields for one element leave its count undecided', () => {
  const doubled = fleetTableBody.replace(
    'name="ship202" id="ship202_input"',
    'name="ship202" id="ship202_input"><input name="ship202" value="1"',
  )
  assert.throws(() => readFleetTable(pageOf(doubled)), {
    code: ErrorCode.ParseError,
    message: 'Duplicate fleet selector ship',
  })
})

void test('the ACS panel is a field of the response that rendered it', () => {
  const table = readFleetTable(pageOf(panelDocument(acsForm(55, 'Raid'))))
  assert.deepEqual(table.acs, {
    mainFleetId: 55,
    name: 'Raid',
    invitedUsers: [
      { id: 4242, name: 'AhMisty' },
      { id: 4243, name: 'Nova' },
    ],

    statusMessage: null,
  })
})

void test('a plain fleet table states no panel, whatever its rows carry', () => {
  assert.equal(readFleetTable(pageOf(fleetTableBody)).acs, null)
  assert.equal(readFleetTable(pageOf(panelDocument(fleetTableAcsRowBody))).acs, null)
})

void test('the outcome the last invitation stated is read from the panel', () => {
  const withOutcome = acsForm(55, 'Raid').replace(
    '<td colspan="2" id="acsName">Raid</td>',
    '<td colspan="2" id="acsName">Raid</td><td colspan="2">Player added</td>',
  )
  assert.equal(
    readFleetTable(pageOf(panelDocument(withOutcome))).acs?.statusMessage,
    'Player added',
  )
})

void test('a panel the endpoint wrote twice, or with an unreadable member list, is refused', () => {
  const ambiguous = panelDocument(acsForm(55, 'Raid') + acsForm(56, 'Nova'))
  const noMembers = panelDocument(acsForm(55, 'Raid').replace(/<select[\s\S]*?<\/select>/, ''))
  const twoMembers = panelDocument(
    acsForm(55, 'Raid').replace(
      '</select>',
      '</select><select><option value="1">Nova</option></select>',
    ),
  )
  const twoOutcomes = panelDocument(
    acsForm(55, 'Raid').replace(
      '<td colspan="2" id="acsName">Raid</td>',
      '<td colspan="2" id="acsName">Raid</td><td colspan="2">one</td><td colspan="2">two</td>',
    ),
  )
  const broken: [string, string, string][] = [
    ['two panels', ambiguous, 'Ambiguous ACS panel'],

    ['no member list', noMembers, 'Invalid ACS member list'],
    ['two member lists', twoMembers, 'Invalid ACS member list'],
    ['two outcomes', twoOutcomes, 'Ambiguous ACS status'],
  ]
  for (const [name, body, message] of broken)
    assert.throws(() => readFleetTable(pageOf(body)), { code: ErrorCode.ParseError, message }, name)
})

void test('a document that is not a fleet table is refused', () => {
  assert.throws(() => readFleetTable(pageOf('<div>Nothing here</div>')), {
    code: ErrorCode.ParseError,
    message: 'Expected one form[action*="fleetStep1"], found 0',
  })
})

void test('recalling a fleet is the table’s own address with the recall command on it', async () => {
  await expectOperation((session) => fleetTableRecall(session, { fleetId: 55 }), {
    method: 'POST',
    url: `${BASE_URL}game.php?action=sendfleetback&page=fleetTable`,
    body: [['fleetID', '55']],
  })
})

void test('opening the panel is the same address with the group command on it', async () => {
  const opened = await expectOperation(
    (session) => fleetTableOpenACS(session, { fleetId: 55 }),
    {
      method: 'POST',
      url: GROUP_URL,
      body: [['fleetID', '55']],
    },
    pageReply(gamePage(panelDocument(acsForm(55, 'Raid')))),
  )
  const panel = await decode(
    (session) => fleetTableOpenACS(session, { fleetId: 55 }),
    pageReply(gamePage(panelDocument(acsForm(55, 'Raid')))),
  )
  assert.equal(panel.data.kind, 'fleetACS')
  if (panel.data.kind === 'fleetACS') {
    assert.ok(panel.data.acs)
    assert.equal(panel.data.acs.mainFleetId, 55)
  }

  assert.equal(opened.requests[0]!.url.searchParams.get('page'), 'fleetTable')
})

void test('renaming the group is the same command with the name beside it', async () => {
  await expectOperation((session) => fleetTableRenameACS(session, { fleetId: 55, name: 'Raid' }), {
    method: 'POST',
    url: GROUP_URL,

    body: [
      ['fleetID', '55'],
      ['acsName', 'Raid'],
    ],
  })
})

void test('inviting a player is the same command with the player beside it', async () => {
  const invited = await expectOperation(
    (session) => fleetTableInviteACS(session, { fleetId: 55, username: 'Nova' }),
    {
      method: 'POST',
      url: GROUP_URL,
      body: [
        ['fleetID', '55'],
        ['username', 'Nova'],
      ],
    },
    pageReply(gamePage(panelDocument(acsForm(55, 'Raid')))),
  )
  const panel = await decode(
    (session) => fleetTableInviteACS(session, { fleetId: 55, username: 'Nova' }),
    pageReply(gamePage(panelDocument(acsForm(55, 'Raid')))),
  )
  assert.equal(panel.data.kind, 'fleetACS')
  if (panel.data.kind === 'fleetACS') {
    assert.ok(panel.data.acs)
    assert.equal(panel.data.acs.mainFleetId, 55)
  }

  assert.equal(invited.requests.length, 1)
})

void test('the three commands share one address and differ only by the body they send', async () => {
  const commands: [Run, { url: string; body: [string, string][] }][] = [
    [
      (session) => fleetTableRecall(session, { fleetId: 55 }),
      {
        url: `${BASE_URL}game.php?action=sendfleetback&page=fleetTable`,
        body: [['fleetID', '55']],
      },
    ],
    [
      (session) => fleetTableOpenACS(session, { fleetId: 55 }),
      { url: GROUP_URL, body: [['fleetID', '55']] },
    ],
    [
      (session) => fleetTableRenameACS(session, { fleetId: 55, name: 'Raid' }),
      {
        url: GROUP_URL,
        body: [
          ['fleetID', '55'],
          ['acsName', 'Raid'],
        ],
      },
    ],
    [
      (session) => fleetTableInviteACS(session, { fleetId: 55, username: 'Nova' }),
      {
        url: GROUP_URL,
        body: [
          ['fleetID', '55'],
          ['username', 'Nova'],
        ],
      },
    ],
  ]
  for (const [run, expected] of commands)
    await expectOperation(run, { method: 'POST', url: expected.url, body: expected.body })
})

void test('dropping a preset is a mode of its own, answering with a message page', async () => {
  const server = await expectOperation(
    (session) => fleetTableDeletePreset(session, { index: 0 }),
    {
      method: 'POST',
      url: `${BASE_URL}game.php?page=fleetTable&mode=delgroop`,
      body: [['id', '0']],
    },
    pageReply(gamePage('<div class="ally_contents">Preset deleted</div>')),
  )
  assert.equal(server.requests.length, 1)
})

void test('unavailable ACS operations preserve a valid fleet table with no panel', async () => {
  const refusedTable = gamePage(fleetTableBody)
  const calls = [
    (session: Session) => fleetTableOpenACS(session, { fleetId: 55 }),
    (session: Session) => fleetTableInviteACS(session, { fleetId: 55, username: 'Nova' }),
  ]
  for (const call of calls) {
    const server = fakeServer(pageReply(refusedTable))
    const result = await call(sessionOn(server))
    assert.deepEqual(result.data, {
      kind: 'fleetACS',
      observedAtMs: result.response.observedAtMs,
      acs: null,
    })
    assert.equal(result.response.body, refusedTable)
    assert.equal(server.requests.length, 1)
  }
})
