import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page, RecordsPage } from '../../../src/index.ts'
import { ErrorCode, parsePage, readRecords, records } from '../../../src/index.ts'
import { recordsPage, recordsWithoutAnchor } from '../../fixtures/game/social.ts'
import {
  BASE_URL,
  PLANET_ID,
  decode,
  expectOperation,
  gamePage,
  httpResponse,
  pageHtml,
  pageReply,
} from '../../helpers.ts'

const RECORDS_URL = `${BASE_URL}game.php?page=records&cp=${PLANET_ID}`

function pageOf(body: string, planetId = PLANET_ID): Page {
  return parsePage(httpResponse({ body: gamePage(body, { planetId }) }, RECORDS_URL))
}

void test('every record table is read row by row', async () => {
  const observed = await decode(
    (session) => records(session, { planetId: PLANET_ID }),
    pageReply(gamePage(recordsPage)),
  )
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'records',

    planetId: PLANET_ID,
    observedAtMs: observed.response.observedAtMs,

    tables: [
      {
        categoryId: 0,
        name: 'Buildings',
        records: [
          {
            elementId: 31,
            name: 'Robotics Factory',
            record: 25,
            owned: 12,

            holders: [
              { id: 4242, name: 'AhMisty' },
              { id: 77, name: 'Scout' },
            ],
          },
          {
            elementId: 44,
            name: 'Ion Cannon',
            record: null,
            owned: null,
            holders: [],
          },
        ],
      },
      {
        categoryId: 400,
        name: 'Defense',
        records: [
          {
            elementId: 402,
            name: 'Rocket Launcher',
            record: null,
            owned: null,
            holders: [],
          },
        ],
      },
    ],
  })
})

void test('the rows are read against the planet the request named', () => {
  const document: RecordsPage = readRecords(pageOf(recordsPage, 1001))
  assert.equal(document.planetId, 1001)
  assert.deepEqual(
    document.tables.map((table) => [table.categoryId, table.name, table.records.length]),
    [
      [0, 'Buildings', 2],
      [400, 'Defense', 1],
    ],
  )
})

void test('a document is not the record tables without the anchor they are read from', () => {
  assert.throws(() => readRecords(pageOf(recordsWithoutAnchor)), {
    code: ErrorCode.ParseError,
    message: 'Expected one #content #u000, found 0',
  })
})

void test('a holder whose control names no player is reported without one', () => {
  const withoutId = recordsPage.replace(
    "onclick='return Dialog.Playercard(77);'",
    "onclick='return Dialog.info(77);'",
  )
  const second = readRecords(pageOf(withoutId)).tables[0]!.records[1]!

  assert.deepEqual(readRecords(pageOf(withoutId)).tables[0]!.records[0]!.holders, [
    { id: 4242, name: 'AhMisty' },
    { id: null, name: 'Scout' },
  ])
  assert.deepEqual(second.holders, [])
})

void test('the record tables are asked for the planet the caller names', async () => {
  await expectOperation((session) => records(session, { planetId: PLANET_ID }), {
    url: RECORDS_URL,
  })
  await expectOperation((session) => records(session, { planetId: 1001 }), {
    url: `${BASE_URL}game.php?page=records&cp=1001`,
  })
})

void test('a document carrying no planet cannot be read as the planet’s records', () => {
  const unaddressed = httpResponse({ body: pageHtml(`<div id="content">${recordsPage}</div>`) })
  assert.throws(() => readRecords(parsePage(unaddressed)), {
    code: ErrorCode.ParseError,
    message: 'Expected one .active_urlpalnet[url], found 0',
  })
})
