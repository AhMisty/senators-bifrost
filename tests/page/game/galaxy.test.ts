import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { GalaxyPage, GalaxyPosition } from '../../../src/index.ts'
import * as bifrost from '../../../src/index.ts'
import { ErrorCode, galaxy, parsePage, readGalaxy } from '../../../src/index.ts'
import {
  galaxyDestroyedPlanetsBody,
  galaxyFormOnlyBody,
  galaxyFormWithoutGalaxyValueBody,
  galaxyMoonWithoutTooltipFiguresBody,
  galaxyNameWithoutActivityBody,
  galaxyOccupiedPositionBody,
  galaxyPlayerActionWithoutPlayerBody,
  galaxyPlayerSpanBody,
  galaxyUnrankedRowsBody,
} from '../../fixtures/game/space.ts'
import {
  BASE_URL,
  decode,
  fakeServer,
  gamePage,
  httpResponse,
  pageReply,
  read,
  sessionOn,
} from '../../helpers.ts'

const PUBLISHED = ['galaxy', 'readGalaxy'] as const

const GALAXY_URL = `${BASE_URL}game.php?galaxy=1&system=2&page=galaxy&cp=1000`

const GALAXY_FORM =
  '<form id="galaxy_form"><input name="galaxy" value="1"><input name="system" value="2"></form>'

const MESSAGE_ROW = `${GALAXY_FORM}
    <div class="gal_user">
      <div class="gal_number"><a href="?page=fleetTable">3</a></div>
      <span id="p_1000" class="tooltip gal_img_planet" data-tooltip-content="planet">
        <a href="javascript:doit(6, 1000);">spy</a>
      </span>
      <div class="gal_planet_name">Homeworld (30 min)</div>
      <div class="gal_player_name">
        <a href="#" onclick="return Dialog.PM(77)"><span class="galaxy-username">AhMisty</span></a>
      </div>
      <div class="gal_ally_name">
        <span class="galaxy-alliance">[ALLY]</span>
        <div data-tooltip-content="<a href='game.php?page=statistics&amp;start=3'>3</a>"></div>
      </div>
    </div>
    <div class="gal_user">
      <div class="gal_number"><a href="?page=fleetTable">4</a></div>
      <span id="p_1001" class="tooltip gal_img_planet" data-tooltip-content="planet"></span>
      <div class="gal_planet_name">Nova</div>
      <div class="gal_player_name"><a href="#"><span class="galaxy-username">Nova</span></a></div>
    </div>`

const MESSAGE_POSITIONS: GalaxyPosition[] = [
  {
    coordinate: { galaxy: 1, system: 2, planet: 3 },
    status: 'occupied',
    planetId: 1000,
    name: 'Homeworld',
    rawActivityText: '(30 min)',
    moon: null,
    debris: null,
    player: { id: 77, name: 'AhMisty', classes: ['galaxy-username'], rank: null },
    alliance: { id: null, tag: '[ALLY]', rank: 3 },
    missions: [{ mission: 6, type: 1 }],
    hasPhalanxControl: false,
  },
  {
    coordinate: { galaxy: 1, system: 2, planet: 4 },
    status: 'occupied',
    planetId: 1001,
    name: 'Nova',
    rawActivityText: null,
    moon: null,
    debris: null,
    player: { id: null, name: 'Nova', classes: ['galaxy-username'], rank: null },
    alliance: null,
    missions: [],
    hasPhalanxControl: false,
  },
]

function positionsOf(body: string): GalaxyPosition[] {
  return readGalaxy(parsePage(httpResponse({ body: gamePage(body) }, GALAXY_URL))).positions
}

function browse(body: string): Promise<GalaxyPage> {
  return read(
    (session) => galaxy(session, { origin: { planetId: 1000 }, target: { galaxy: 1, system: 2 } }),
    pageReply(gamePage(body)),
  )
}

void test('the page module publishes every function this test asserts', () => {
  const names: readonly string[] = Object.keys(bifrost)
  for (const name of PUBLISHED) assert.ok(names.includes(name), name)
})

void test('a browse is a GET that names the pair on the address, which the server charges for', async () => {
  const server = fakeServer(pageReply(gamePage(galaxyOccupiedPositionBody)))
  const observed = await galaxy(sessionOn(server), {
    origin: { planetId: 1000 },
    target: { galaxy: 1, system: 2 },
  })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.body, null)
  assert.equal(server.requests[0]!.url.href, GALAXY_URL)
  const data = observed.data
  if (data.kind !== 'galaxy')
    assert.fail(`expected a document, answered with the ${data.kind} receipt`)
  assert.equal(data.galaxy, 1)
  assert.equal(data.system, 2)
  assert.equal(data.positions.length, 2)
})

void test('a system the account cannot pay to browse is reported as the message page', async () => {
  const observed = await decode(
    (session) => galaxy(session, { origin: { planetId: 1000 }, target: { galaxy: 9, system: 9 } }),
    pageReply(gamePage('<div class="ally_contents">You need more deuterium</div>')),
  )
  assert.deepEqual(observed.data, {
    planetId: 1000,
    kind: 'message',
    message: 'You need more deuterium',
  })
})

void test('a browse reports the pair the server answered for and every position it listed', async () => {
  const page = await browse(galaxyOccupiedPositionBody)
  assert.equal(page.kind, 'galaxy')
  assert.equal(page.planetId, 1000)
  assert.equal(page.galaxy, 1)
  assert.equal(page.system, 2)
  assert.deepEqual(page.positions, [
    {
      coordinate: { galaxy: 1, system: 2, planet: 3 },
      status: 'occupied',
      planetId: 1000,
      name: 'Homeworld',
      rawActivityText: '(15 min)',
      moon: { id: 1001, diameter: 8660, temperature: -20 },
      debris: { metal: 1000, crystal: 500 },
      player: {
        id: 4242,
        name: 'AhMisty',
        classes: ['galaxy-username-class1', 'galaxy-username'],
        rank: 7,
      },
      alliance: { id: 9, tag: '[ALLY]', rank: 3 },
      missions: [
        { mission: 1, type: 1 },
        { mission: 6, type: 3 },
        { mission: 8, type: 2 },
        { mission: 10, type: 1 },
      ],
      hasPhalanxControl: true,
    },
    {
      coordinate: { galaxy: 1, system: 2, planet: 4 },
      status: 'empty',
      planetId: null,
      name: null,
      rawActivityText: null,
      moon: null,
      debris: null,
      player: null,
      alliance: null,
      missions: [],
      hasPhalanxControl: false,
    },
  ])
})

void test('a position whose planet is gone is reported as destroyed', () => {
  assert.deepEqual(
    positionsOf(galaxyDestroyedPlanetsBody).map(({ status, planetId, name }) => ({
      status,
      planetId,
      name,
    })),
    [
      { status: 'destroyed', planetId: null, name: null },
      { status: 'destroyed', planetId: null, name: null },
    ],
  )
})

void test('the same mission named twice is listed once', () => {
  assert.deepEqual(positionsOf(galaxyDestroyedPlanetsBody)[0]!.missions, [{ mission: 1, type: 1 }])
  assert.deepEqual(positionsOf(galaxyDestroyedPlanetsBody)[1]!.missions, [])
})

void test('a name without an activity suffix reports none', () => {
  const position = positionsOf(galaxyNameWithoutActivityBody)[0]!
  assert.equal(position.name, 'Homeworld')
  assert.equal(position.rawActivityText, null)
})

void test('the moon figures a tooltip omits are reported as absent rather than as zero', () => {
  const nova = positionsOf(galaxyMoonWithoutTooltipFiguresBody)[0]!,
    outpost = positionsOf(galaxyMoonWithoutTooltipFiguresBody)[1]!

  assert.deepEqual(nova.moon, { id: 1001, diameter: 8660, temperature: null })
  assert.deepEqual(nova.missions, [{ mission: 6, type: 3 }])
  assert.deepEqual(outpost.moon, { id: null, diameter: null, temperature: null })
  assert.deepEqual(outpost.missions, [])
})

void test('the classes reported are the ones the span naming the player carries', () => {
  const position = positionsOf(galaxyPlayerSpanBody)[0]!

  assert.deepEqual(position.player, {
    id: 4242,
    name: 'AhMisty',
    classes: ['galaxy-username-cool', 'galaxy-username'],
    rank: null,
  })
})

void test('a statistics link that states no position reports it as unstated', () => {
  const positions = positionsOf(galaxyUnrankedRowsBody)
  const ids = positions.map(({ player, alliance }) => [player?.id, alliance?.id])
  assert.deepEqual(
    positions.map(({ player, alliance }) => [player?.rank, alliance?.rank]),
    [
      [null, null],
      [null, null],
    ],
  )

  assert.deepEqual(ids, [
    [4242, 9],
    [4243, 10],
  ])
})

void test('a player the row offers no card for is reached through the message handler', () => {
  assert.deepEqual(positionsOf(MESSAGE_ROW), MESSAGE_POSITIONS)
})

void test('a player action that names no element is a decoding failure', async () => {
  await assert.rejects(() => browse(galaxyPlayerActionWithoutPlayerBody), {
    code: ErrorCode.ParseError,
    message: 'Invalid player action',
  })
})

void test('an icon that does not name the position it belongs to is a decoding failure', async () => {
  const broken: [string, string, string][] = [
    ['no id at all', '<span class="gal_img_planet"></span>', 'Expected a numeric value'],
    [
      'an id that is not a position',
      '<span id="planet_1000" class="gal_img_planet"></span>',
      'Expected a numeric value',
    ],
  ]
  for (const [name, icon, message] of broken)
    await assert.rejects(
      () => browse(`${GALAXY_FORM}<div class="gal_user">${icon}</div>`),
      { code: ErrorCode.ParseError, message },
      name,
    )
})

void test('a form control without the value it would submit is a decoding failure', async () => {
  await assert.rejects(() => browse(galaxyFormWithoutGalaxyValueBody), {
    code: ErrorCode.ParseError,
    message: 'Missing value on #galaxy_form input[name="galaxy"]',
  })
})

void test('a document that lists no position at all is a decoding failure', async () => {
  await assert.rejects(() => browse(galaxyFormOnlyBody), {
    code: ErrorCode.ParseError,
    message: 'Missing galaxy positions',
  })
})
