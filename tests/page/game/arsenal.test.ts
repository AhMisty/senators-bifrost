import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ErrorCode, arsenal } from '../../../src/index.ts'
import { arsenalEntryBody, cataloguePageBody } from '../../fixtures/game/growth.ts'
import {
  BASE_URL,
  PLANET_ID,
  expectOperation,
  fakeServer,
  pageHtml,
  pageReply,
  read,
  sessionOn,
  DEFAULT_HEADER,
} from '../../helpers.ts'

const PAGE_URL = `${BASE_URL}game.php?page=arsenal`

function document(planetId = PLANET_ID, entry = arsenalEntryBody()): string {
  return pageHtml(cataloguePageBody(entry, planetId, DEFAULT_HEADER))
}

void test('a catalogue about the account is read without naming a planet', async () => {
  const response = pageReply(document())
  await expectOperation(
    (session) => arsenal(session),
    {
      method: 'GET',
      url: PAGE_URL,
    },
    response,
  )
  const catalogue = await read((session) => arsenal(session), response)
  assert.equal(catalogue.kind, 'arsenal')
  assert.equal('planetId' in catalogue, false)
})

void test('the account catalogue omits the navigation planet', async () => {
  const response = pageReply(document(4242))
  await expectOperation((session) => arsenal(session), { method: 'GET', url: PAGE_URL }, response)
  assert.equal('planetId' in (await read((session) => arsenal(session), response)), false)
})

void test('an entry states its level through the display formatter and prices nothing', async () => {
  const catalogue = await read((session) => arsenal(session), pageReply(document()))
  assert.equal(catalogue.items.length, 1)
  const admiral = catalogue.items[0]!
  assert.equal(admiral.elementId, 2001)
  assert.equal(admiral.name, 'Admiral')

  assert.deepEqual([admiral.owned, admiral.maximumLevel], [1500, 20000])

  assert.deepEqual(admiral.costs, [])
  assert.equal(admiral.maximumPurchase, null)
  assert.equal(admiral.hasSubmitControl, false)
  assert.equal(admiral.remainingSeconds, null)
  assert.deepEqual(admiral.effects, [])
  assert.deepEqual(admiral.requirements, [])

  assert.equal(admiral.category, 'fleet')
})

void test('the group each entry belongs to is read from its id', async () => {
  const settled = await Promise.allSettled(
    [2001, 2004, 601].map(async (elementId) =>
      (
        await read(
          (session) => arsenal(session),
          pageReply(document(undefined, arsenalEntryBody(elementId))),
        )
      ).items.map((item) => item.category),
    ),
  )
  const errors = settled.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []))
  if (errors.length) throw new AggregateError(errors, 'Arsenal group checks failed')
  const groups = settled.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
  assert.deepEqual(groups, [['fleet'], ['shield'], [null]])
})

void test('a page without the catalogue container is a decoding failure', async () => {
  await assert.rejects(
    () => arsenal(sessionOn(fakeServer(pageReply(pageHtml('<p>nothing here</p>'))))),
    { code: ErrorCode.ParseError, message: 'Expected one #page > #content, found 0' },
  )
})
