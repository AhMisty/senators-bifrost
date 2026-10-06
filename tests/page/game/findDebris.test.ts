import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { FindDebrisPage } from '../../../src/index.ts'
import * as bifrost from '../../../src/index.ts'
import { ErrorCode, findDebris, parsePage, readFindDebris } from '../../../src/index.ts'
import {
  debrisIncompleteRowBody,
  debrisRowWithoutHarvestColumnBody,
  debrisRowWithoutHarvestPlanetBody,
  debrisTableWithoutControlBody,
  findDebrisBody,
} from '../../fixtures/game/space.ts'
import type { Reply } from '../../helpers.ts'
import {
  BASE_URL,
  expectOperation,
  gamePage,
  httpResponse,
  pageReply,
  read,
} from '../../helpers.ts'

const PUBLISHED = ['findDebris', 'readFindDebris'] as const

const SEARCH_URL = `${BASE_URL}game.php?y=1&page=findDebris&cp=1000`

const FOUND: FindDebrisPage = {
  kind: 'findDebris',
  planetId: 1000,
  observedAtMs: 1,
  fields: [
    {
      planetId: 2001,
      coordinate: { galaxy: 1, system: 2, planet: 3 },
      metal: 1000,
      crystal: 500,
    },
  ],
}

function search(response: Reply): Promise<FindDebrisPage> {
  return read((session) => findDebris(session, { planetId: 1000 }), response)
}

void test('the page module publishes every function this test asserts', () => {
  const names: readonly string[] = Object.keys(bifrost)
  for (const name of PUBLISHED) assert.ok(names.includes(name), name)
})

void test('a search is asked for by the route and the search parameter alone', async () => {
  const server = await expectOperation((session) => findDebris(session, { planetId: 1000 }), {
    method: 'GET',
    url: SEARCH_URL,
  })
  assert.equal(server.requests[0]!.body, null)
})

void test('a field the search found is read with the planet its harvest action addresses', async () => {
  const page = await search(pageReply(gamePage(findDebrisBody)))
  assert.deepEqual(page.fields, FOUND.fields)
  assert.equal(page.kind, 'findDebris')
  assert.equal(page.planetId, 1000)

  assert.ok(Number.isFinite(page.observedAtMs))
})

void test('a search that found nothing lists no field', async () => {
  const page = await search(pageReply(gamePage(debrisTableWithoutControlBody)))
  assert.deepEqual(page.fields, [])
  assert.equal(page.planetId, 1000)
})

void test('a row that does not list the six cells of a field is a decoding failure', async () => {
  await assert.rejects(() => search(pageReply(gamePage(debrisIncompleteRowBody))), {
    code: ErrorCode.ParseError,
    message: 'Incomplete debris record',
  })
})

void test('a harvest action that names no planet leaves the row unreadable', async () => {
  await assert.rejects(() => search(pageReply(gamePage(debrisRowWithoutHarvestPlanetBody))), {
    code: ErrorCode.ParseError,
    message: 'Expected a numeric value',
  })
})

void test('a last cell that offers no harvest action at all is a decoding failure', async () => {
  await assert.rejects(() => search(pageReply(gamePage(debrisRowWithoutHarvestColumnBody))), {
    code: ErrorCode.ParseError,
    message: 'Missing href on the selected element',
  })
})

void test('a document that carries no search table is not read as an empty search', async () => {
  await assert.rejects(() => search(pageReply(gamePage('<p>Nothing</p>'))), {
    code: ErrorCode.ParseError,
    message: 'Expected one table.ally_ranks, found 0',
  })
})

void test('the decoder reads a document a caller already holds', () => {
  const page = readFindDebris(
    parsePage(httpResponse({ body: gamePage(findDebrisBody) }, SEARCH_URL)),
  )
  assert.deepEqual(page, FOUND)
})
