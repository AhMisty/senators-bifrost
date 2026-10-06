import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page, Session } from '../../../src/index.ts'
import * as bifrost from '../../../src/index.ts'
import {
  ErrorCode,
  buildings,
  buildingsCancel,
  buildingsDowngrade,
  buildingsFinish,
  buildingsRemove,
  buildingsUpgrade,
  parsePage,
  readBuildings,
} from '../../../src/index.ts'
import {
  buildingsEmptyLevelDataBody,
  buildingsEnergyBody,
  buildingsInvalidLevelScriptBody,
  buildingsPageBody,
  buildingsQueueElementWithoutLevelBody,
  buildingsQueueRemovalWithoutElementBody,
  buildingsQueueWithoutRowsBody,
  buildingsTwoQueueBlocksBody,
  buildingsWithoutQueueBody,
} from '../../fixtures/game/construction.ts'
import type { Reply } from '../../helpers.ts'
import {
  BASE_URL,
  PLANET_ID,
  answer,
  decode,
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

const BUILDINGS_URL = `${BASE_URL}game.php?page=buildings&cp=${PLANET_ID}`

function documentOf(content: string, header = HEADER): string {
  return gamePage(content, { planetId: PLANET_ID, header })
}

function pageOf(content: string, options: { url?: string; header?: string } = {}): Page {
  const body = documentOf(content, options.header ?? HEADER)
  return parsePage(httpResponse({ body }, options.url ?? BUILDINGS_URL))
}

const FIELD_BAND =
  '<div class="fildes_band_text">Fields taken: <span>12</span> of <span>163</span> Free: <span>151</span></div>'

const LEVELS_WITH_IDS =
  FIELD_BAND +
  '<script>var DatatList = {"31":{"id":"31","level":"5"},"23":{"id":"23","level":"2"}};</script>'

const LEVELS_MISMATCHED_ID = '<script>var DatatList = {"31":{"id":"32","level":"5"}};</script>'

const LEVELS_WITHOUT_A_LEVEL = '<script>var DatatList = {"31":{"maxLevel":"20"}};</script>'

const LEVELS_UNBOUND = '<div class="fildes_band_text">x</div>'

const QUEUE_WITH_STORE_ROW = [
  FIELD_BAND,
  '<div id="build_process" class="bui4era">',
  '<div class="element_row active_row" style="background:url(gebaeude/31.gif)">',
  '<div class="right_hand">',
  '<div id="time" data-time="3600"></div>',
  '<span class="onlistremov ">5</span>',
  '</div>',
  '<div class="band_process" id="progressbar" data-time="1800"></div>',
  '</div>',
  '<div class="element_row"><a href="game.php?page=store"><div class="pluscos">+</div></a></div>',
  '</div>',
  '<script>var DatatList = {"31":{"level":"5"}};</script>',
].join('')

const EXPORTS: Readonly<Record<string, unknown>> = {
  readBuildings,
  buildings,
  buildingsUpgrade,
  buildingsCancel,
  buildingsRemove,
  buildingsDowngrade,
  buildingsFinish,
}

void test('the page publishes one reader and one function per queue command', () => {
  const published = Object.entries(bifrost)
    .map(([name]) => name)
    .filter((name) => name === 'readBuildings' || name.startsWith('buildings'))
    .toSorted()
  assert.deepEqual(published, Object.keys(EXPORTS).toSorted())
  for (const [name, value] of Object.entries(EXPORTS)) assert.equal(typeof value, 'function', name)
})

void test('the list is read from the document the page rendered', async () => {
  const document = await read(
    (session) => buildings(session, { planetId: PLANET_ID }),
    pageReply(gamePage(buildingsPageBody, { planetId: PLANET_ID, header: HEADER })),
  )
  assert.deepEqual(document, {
    kind: 'buildings',
    planetId: PLANET_ID,
    observedAtMs: document.observedAtMs,

    levels: new Map([
      [31, 5],
      [23, 2],
    ]),
    quotes: new Map(),
    queue: [
      { elementId: 31, level: 5, finishTimeText: '01.01.2026 12:00:00' },

      { elementId: 23, level: 2, finishTimeText: null },
    ],

    currentTiming: { durationSeconds: 3600, remainingSeconds: 900, progressPercent: 75 },

    fields: { used: 12, total: 163, free: 151 },
  })
})

void test('building quotes use the raw server script values rather than displayed rounded text', () => {
  const document = readBuildings(
    pageOf(
      FIELD_BAND +
        '<script>DatatList={"31":{"level":"5","maxLevel":"40","factor":"1.5","costResources":{"901":1234.25,"902":567.5},"elementTime":3600}};</script>',
    ),
  )
  assert.deepEqual(
    [...document.quotes],
    [
      [
        31,
        {
          elementId: 31,
          currentLevel: 5,
          maximumLevel: 40,
          factor: 1.5,
          costs: new Map([
            [901, 1234.25],
            [902, 567.5],
          ]),
          durationSeconds: 3600,
        },
      ],
    ],
  )
})

void test('a level entry may repeat its own id beside the key naming it', () => {
  const document = readBuildings(pageOf(LEVELS_WITH_IDS))

  assert.deepEqual(
    [...document.levels],
    [
      [23, 2],
      [31, 5],
    ],
  )

  assert.deepEqual(document.queue, [])
  assert.equal(document.currentTiming, null)
})

void test('a reading of a page a template could not have rendered is a decoding failure', () => {
  const broken: [string, string, string][] = [
    ['an entry naming an element its key does not', LEVELS_MISMATCHED_ID, 'Element ID mismatch'],

    ['an entry with no level', LEVELS_WITHOUT_A_LEVEL, 'Expected a numeric value'],
    ['no level data at all', buildingsEmptyLevelDataBody, 'Empty level data'],
    ['a script the runtime cannot parse', buildingsInvalidLevelScriptBody, 'Invalid script'],
    ['no binding at all', LEVELS_UNBOUND, 'Expected one DatatList binding, found 0'],

    [
      'a removal without an element',
      buildingsQueueRemovalWithoutElementBody,
      'Queue item has no element ID',
    ],

    [
      'a queued element with no level',
      buildingsQueueElementWithoutLevelBody,
      'Missing queued level',
    ],

    ['two queue blocks', buildingsTwoQueueBlocksBody, 'Ambiguous construction queue'],

    [
      'a queue block with no readable row',
      buildingsQueueWithoutRowsBody,
      'Queue block has no items',
    ],
  ]
  for (const [name, body, message] of broken)
    assert.throws(() => readBuildings(pageOf(body)), { code: ErrorCode.ParseError, message }, name)
})

void test('the store row the template appends to the queue is not a queued building', () => {
  const document = readBuildings(pageOf(QUEUE_WITH_STORE_ROW))
  assert.deepEqual(document.queue, [{ elementId: 31, level: 5, finishTimeText: null }])
  assert.deepEqual(document.currentTiming, {
    durationSeconds: 3600,
    remainingSeconds: 1800,
    progressPercent: 50,
  })
})

void test('a document with no queue block states no queue and no countdown', () => {
  const document = readBuildings(pageOf(buildingsWithoutQueueBody))
  assert.deepEqual(document.queue, [])
  assert.equal(document.currentTiming, null)
  assert.deepEqual(document.fields, { used: 1, total: 2, free: 1 })
})

void test('the field band is read from the three spans the template writes', () => {
  const document = readBuildings(pageOf(buildingsEnergyBody()))
  assert.deepEqual(document.fields, { used: 12, total: 163, free: 151 })
  assert.deepEqual([...document.levels], [[31, 5]])
})

void test('the list and every queue command are one address', async () => {
  const operations: [
    name: string,
    expected: { method: 'GET' | 'POST'; url: string; body?: [string, string][] },
    run: (session: Session) => Promise<unknown>,
  ][] = [
    [
      'the list',
      { method: 'GET', url: BUILDINGS_URL },
      (session) => buildings(session, { planetId: PLANET_ID }),
    ],
    [
      'insert',
      {
        method: 'POST',
        url: BUILDINGS_URL,
        body: [
          ['cmd', 'insert'],
          ['building', '31'],
          ['lvlup', '3'],
          ['levelToBuildInFo', '0'],
        ],
      },
      (session) => buildingsUpgrade(session, { planetId: PLANET_ID, elementId: 31, levels: 3 }),
    ],
    [
      'cancel',
      { method: 'POST', url: BUILDINGS_URL, body: [['cmd', 'cancel']] },
      (session) => buildingsCancel(session, { planetId: PLANET_ID }),
    ],
    [
      'remove',
      {
        method: 'POST',
        url: BUILDINGS_URL,
        body: [
          ['cmd', 'remove'],
          ['listid', '2'],
        ],
      },
      (session) => buildingsRemove(session, { planetId: PLANET_ID, queueIndex: 1 }),
    ],
    [
      'destroy',
      {
        method: 'POST',
        url: BUILDINGS_URL,
        body: [
          ['cmd', 'destroy'],
          ['building', '31'],
        ],
      },
      (session) => buildingsDowngrade(session, { planetId: PLANET_ID, elementId: 31 }),
    ],
    [
      'fast',
      { method: 'POST', url: BUILDINGS_URL, body: [['cmd', 'fast']] },
      (session) => buildingsFinish(session, { planetId: PLANET_ID }),
    ],
  ]
  const addresses: [string, string][] = []
  for (const [name, expected, run] of operations) {
    const server = await expectOperation(run, expected)
    addresses.push([name, server.requests[0]!.url.href])
  }
  for (const [name, address] of addresses) assert.equal(address, addresses[0]![1], name)
})

void test('queueing levels names the building, the count, and a zero level already built', async () => {
  await expectOperation(
    (session) => buildingsUpgrade(session, { planetId: PLANET_ID, elementId: 31, levels: 4 }),
    {
      method: 'POST',
      url: BUILDINGS_URL,

      body: [
        ['cmd', 'insert'],
        ['building', '31'],
        ['lvlup', '4'],
        ['levelToBuildInFo', '0'],
      ],
    },
  )
})

void test('dropping the entry under construction names no further field', async () => {
  await expectOperation((session) => buildingsCancel(session, { planetId: PLANET_ID }), {
    method: 'POST',
    url: BUILDINGS_URL,
    body: [['cmd', 'cancel']],
  })
})

void test('dropping a queued entry sends its 1-based position in the whole queue', async () => {
  for (const [queueIndex, listid] of [
    [0, '1'],
    [3, '4'],
  ] as const)
    await expectOperation(
      (session) => buildingsRemove(session, { planetId: PLANET_ID, queueIndex }),
      {
        method: 'POST',
        url: BUILDINGS_URL,
        body: [
          ['cmd', 'remove'],
          ['listid', listid],
        ],
      },
    )
})

void test('dismantling one level sends the destroy command for the element alone', async () => {
  await expectOperation(
    (session) => buildingsDowngrade(session, { planetId: PLANET_ID, elementId: 31 }),
    {
      method: 'POST',
      url: BUILDINGS_URL,

      body: [
        ['cmd', 'destroy'],
        ['building', '31'],
      ],
    },
  )
})

void test('completing the entry at once names no further field', async () => {
  await expectOperation((session) => buildingsFinish(session, { planetId: PLANET_ID }), {
    method: 'POST',
    url: BUILDINGS_URL,
    body: [['cmd', 'fast']],
  })
})

void test('a dead session and an empty body are reported as the receipts they are', async () => {
  const answers: [string, Reply, string][] = [
    [
      'a dead session',
      { status: 302, headers: { Location: './index.php?page=login' } },
      'redirect',
    ],
    ['an empty body', { body: '' }, 'empty'],
  ]
  for (const [name, reply, kind] of answers) {
    const observed = await decode((session) => buildings(session, { planetId: PLANET_ID }), reply)
    assert.equal(observed.data.kind, kind, name)
  }
})

void test('a queue command the server refused is reported as the message it printed', async () => {
  const observed = await answer(
    (session) => buildingsUpgrade(session, { planetId: PLANET_ID, elementId: 31, levels: 4 }),
    pageReply(gamePage('<div class="ally_contents">Not enough metal</div>')),
  )
  assert.deepEqual(observed.data, { planetId: 1000, kind: 'message', message: 'Not enough metal' })
})
