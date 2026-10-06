import assert from 'node:assert/strict'
import { test } from 'node:test'

import { scan } from '../../../src/index.ts'
import * as scanModule from '../../../src/page/game/scan.ts'
import { BASE_URL, answer, expectOperation } from '../../helpers.ts'

const SCAN_URL = `${BASE_URL}game.php?page=scan&mode=Show`

void test('the page module publishes the one function it owns, and nothing else', () => {
  assert.deepEqual(Object.keys(scanModule).toSorted(), ['scan'])
})

void test('the counter arrives as the bare number the endpoint echoed', async () => {
  const observed = await answer((session) => scan(session), { body: '4' })
  assert.deepEqual(observed.data, { kind: 'text', text: '4' })
})

void test('the count is asked for by the route alone, with no planet on the address', async () => {
  const server = await expectOperation((session) => scan(session), { method: 'GET', url: SCAN_URL })

  assert.equal(server.requests[0]!.url.searchParams.get('cp'), null)
  assert.equal(server.requests[0]!.body, null)
})

void test('a body that carries no count is reported as the kind it is', async () => {
  const observed = await answer((session) => scan(session), {})
  assert.deepEqual(observed.data, { kind: 'empty' })
})
