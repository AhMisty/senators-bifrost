import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page, Session } from '../../../src/index.ts'
import * as bifrost from '../../../src/index.ts'
import {
  ErrorCode,
  parsePage,
  readResearch,
  research,
  researchCancel,
  researchFinish,
  researchRemove,
  researchUpgrade,
} from '../../../src/index.ts'
import {
  researchMismatchedElementIdBody,
  researchPageBody,
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

const RESEARCH_URL = `${BASE_URL}game.php?page=research&cp=${PLANET_ID}`

function documentOf(content: string): string {
  return gamePage(content, { planetId: PLANET_ID, header: HEADER })
}

function pageOf(content: string): Page {
  return parsePage(httpResponse({ body: documentOf(content) }, RESEARCH_URL))
}

const LEVELS_WITHOUT_IDS = '<script>DatatList = {"113":{ "level":"3","maxLevel":"20" }};</script>'

const LEVELS_EMPTY = '<script>DatatList = {};</script>'

const LEVELS_UNPARSEABLE = '<script>DatatList = {"113": {"level": oops(};</script>'

const ONE_LEVEL = '<script>DatatList = {"113":{ "id":"113","level":"3" }};</script>'

const QUEUE_REMOVAL_WITHOUT_ELEMENT =
  '<div id="build_process"><div class="element_row"><span class="onlistremov">5</span></div></div>' +
  ONE_LEVEL

const QUEUE_ELEMENT_WITHOUT_LEVEL =
  '<div id="build_process"><div class="element_row" style="background:url(gebaeude/113.gif)"></div></div>' +
  ONE_LEVEL

const QUEUE_TWO_BLOCKS = '<div id="build_process"></div><div id="build_process"></div>' + ONE_LEVEL

const QUEUE_WITHOUT_READABLE_ROWS =
  '<div id="build_process"><div class="element_row"><div class="right_hand">' +
  '<span class="onlistrenum">1</span></div></div></div>' +
  ONE_LEVEL

const QUEUE_WITHOUT_FINISH_TIME = [
  '<div id="build_process" class="ric4era">',
  '<div class="element_row active_row" style="background:url(gebaeude/113.gif)">',
  '<div class="right_hand">',
  '<div id="time" data-time="600"></div>',
  '<span class="onlistremov">3</span>',
  '</div>',
  '<div class="band_process" id="progressbar" data-time="300"></div>',
  '</div>',
  '</div>',
  '<script>DatatList = {"113":{ "id":"113","level":"3" }};</script>',
].join('')

const QUEUE_WITH_STORE_ROW = [
  '<div id="build_process" class="ric4era">',
  '<div class="element_row active_row" style="background:url(gebaeude/113.gif)">',
  '<div class="right_hand">',
  '<div id="time" data-time="600"></div>',
  '<span class="data_scad">01.01.2026 12:10:00</span>',
  '<span class="onlistremov">3</span>',
  '</div>',
  '<div class="band_process" id="progressbar" data-time="300"></div>',
  '</div>',
  '<div class="element_row"><a href="game.php?page=store"><div class="pluscos">+</div></a></div>',
  '</div>',
  '<script>DatatList = {"113":{ "id":"113","level":"3" }};</script>',
].join('')

const EXPORTS: Readonly<Record<string, unknown>> = {
  readResearch,
  research,
  researchUpgrade,
  researchCancel,
  researchRemove,
  researchFinish,
}

void test('the page publishes one reader and one function per queue command', () => {
  const published = Object.entries(bifrost)
    .map(([name]) => name)
    .filter((name) => name === 'readResearch' || name.startsWith('research'))
    .toSorted()
  assert.deepEqual(published, Object.keys(EXPORTS).toSorted())
  for (const [name, value] of Object.entries(EXPORTS)) assert.equal(typeof value, 'function', name)
})

void test('the list is read from the document the page rendered', async () => {
  const document = await read(
    (session) => research(session, { planetId: PLANET_ID }),
    pageReply(gamePage(researchPageBody, { planetId: PLANET_ID, header: HEADER })),
  )
  assert.deepEqual(document, {
    kind: 'research',
    planetId: PLANET_ID,
    observedAtMs: document.observedAtMs,

    levels: new Map([[113, 3]]),
    quotes: new Map(),
    queue: [{ elementId: 113, level: 3, finishTimeText: '01.01.2026 12:10:00' }],

    currentTiming: { durationSeconds: 600, remainingSeconds: 600, progressPercent: 0 },
  })
})

void test('research quotes read the server template spelling of raw costs', () => {
  const document = readResearch(
    pageOf(
      '<script>DatatList={"113":{"id":"113","level":"3","maxLevel":"20","factor":"2","costRessources":{"901":800,"902":400},"elementTime":600}};</script>',
    ),
  )
  assert.deepEqual(
    [...document.quotes],
    [
      [
        113,
        {
          elementId: 113,
          currentLevel: 3,
          maximumLevel: 20,
          factor: 2,
          costs: new Map([
            [901, 800],
            [902, 400],
          ]),
          durationSeconds: 600,
        },
      ],
    ],
  )
})

void test('a level entry the page states no id for is read from the key naming it', () => {
  const document = readResearch(pageOf(LEVELS_WITHOUT_IDS))
  assert.deepEqual([...document.levels], [[113, 3]])

  assert.deepEqual(document.queue, [])
  assert.equal(document.currentTiming, null)
})

void test('a reading of a page a template could not have rendered is a decoding failure', () => {
  const broken: [string, string, string][] = [
    [
      'an entry naming an element its key does not',
      researchMismatchedElementIdBody,
      'Element ID mismatch',
    ],
    ['no level data at all', LEVELS_EMPTY, 'Empty level data'],
    ['a script the runtime cannot parse', LEVELS_UNPARSEABLE, 'Invalid script'],
    ['a removal without an element', QUEUE_REMOVAL_WITHOUT_ELEMENT, 'Queue item has no element ID'],

    ['a queued technology with no level', QUEUE_ELEMENT_WITHOUT_LEVEL, 'Missing queued level'],
    ['two queue blocks', QUEUE_TWO_BLOCKS, 'Ambiguous construction queue'],

    ['a queue block with no readable row', QUEUE_WITHOUT_READABLE_ROWS, 'Queue block has no items'],
  ]
  for (const [name, body, message] of broken)
    assert.throws(() => readResearch(pageOf(body)), { code: ErrorCode.ParseError, message }, name)
})

void test('a queued technology the page printed no completion time for states none', () => {
  const document = readResearch(pageOf(QUEUE_WITHOUT_FINISH_TIME))
  assert.deepEqual(document.queue, [{ elementId: 113, level: 3, finishTimeText: null }])
  assert.deepEqual(document.currentTiming, {
    durationSeconds: 600,
    remainingSeconds: 300,
    progressPercent: 50,
  })
})

void test('the store row the template appends to the queue is not a queued technology', () => {
  const document = readResearch(pageOf(QUEUE_WITH_STORE_ROW))

  assert.deepEqual(document.queue, [
    { elementId: 113, level: 3, finishTimeText: '01.01.2026 12:10:00' },
  ])
  assert.deepEqual(document.currentTiming, {
    durationSeconds: 600,
    remainingSeconds: 300,
    progressPercent: 50,
  })
})

void test('the list and every queue command are one address', async () => {
  const operations: [
    name: string,
    expected: { method: 'GET' | 'POST'; url: string; body?: [string, string][] },
    run: (session: Session) => Promise<unknown>,
  ][] = [
    [
      'the list',
      { method: 'GET', url: RESEARCH_URL },
      (session) => research(session, { planetId: PLANET_ID }),
    ],
    [
      'insert',
      {
        method: 'POST',
        url: RESEARCH_URL,
        body: [
          ['cmd', 'insert'],
          ['tech', '113'],
          ['lvlup', '2'],
          ['levelToBuildInFo', '0'],
        ],
      },
      (session) => researchUpgrade(session, { planetId: PLANET_ID, elementId: 113, levels: 2 }),
    ],
    [
      'cancel',
      { method: 'POST', url: RESEARCH_URL, body: [['cmd', 'cancel']] },
      (session) => researchCancel(session, { planetId: PLANET_ID }),
    ],
    [
      'remove',
      {
        method: 'POST',
        url: RESEARCH_URL,
        body: [
          ['cmd', 'remove'],
          ['listid', '4'],
        ],
      },
      (session) => researchRemove(session, { planetId: PLANET_ID, queueIndex: 3 }),
    ],
    [
      'fast',
      { method: 'POST', url: RESEARCH_URL, body: [['cmd', 'fast']] },
      (session) => researchFinish(session, { planetId: PLANET_ID }),
    ],
  ]
  const addresses: [string, string][] = []
  for (const [name, expected, run] of operations) {
    const server = await expectOperation(run, expected)
    addresses.push([name, server.requests[0]!.url.href])
  }
  for (const [name, address] of addresses) assert.equal(address, addresses[0]![1], name)
})

void test('queueing levels names the technology, the count, and a zero level already researched', async () => {
  await expectOperation(
    (session) => researchUpgrade(session, { planetId: PLANET_ID, elementId: 113, levels: 5 }),
    {
      method: 'POST',
      url: RESEARCH_URL,

      body: [
        ['cmd', 'insert'],
        ['tech', '113'],
        ['lvlup', '5'],
        ['levelToBuildInFo', '0'],
      ],
    },
  )
})

void test('dropping the entry under research names no further field', async () => {
  await expectOperation((session) => researchCancel(session, { planetId: PLANET_ID }), {
    method: 'POST',
    url: RESEARCH_URL,
    body: [['cmd', 'cancel']],
  })
})

void test('dropping a queued entry sends its 1-based position in the whole queue', async () => {
  for (const [queueIndex, listid] of [
    [0, '1'],
    [3, '4'],
  ] as const)
    await expectOperation(
      (session) => researchRemove(session, { planetId: PLANET_ID, queueIndex }),
      {
        method: 'POST',
        url: RESEARCH_URL,
        body: [
          ['cmd', 'remove'],
          ['listid', listid],
        ],
      },
    )
})

void test('completing the entry at once names no further field', async () => {
  await expectOperation((session) => researchFinish(session, { planetId: PLANET_ID }), {
    method: 'POST',
    url: RESEARCH_URL,
    body: [['cmd', 'fast']],
  })
})

void test('a queue command the server refused is reported as the message it printed', async () => {
  const observed = await answer(
    (session) => researchUpgrade(session, { planetId: PLANET_ID, elementId: 113, levels: 5 }),
    pageReply(gamePage('<div class="ally_contents">Not enough crystal</div>')),
  )
  assert.deepEqual(observed.data, {
    planetId: 1000,
    kind: 'message',
    message: 'Not enough crystal',
  })
})
