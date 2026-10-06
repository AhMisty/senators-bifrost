import assert from 'node:assert/strict'
import { test } from 'node:test'

import { adminClearCache } from '../../../src/index.ts'
import { adminNoticeCard } from '../../fixtures/admin/index.ts'
import { BASE_URL, TOKEN, fakeServer, pageHtml, pageReply, sessionOn } from '../../helpers.ts'

const CLEAR_CACHE_URL = `${BASE_URL}admin.php?page=clearCache`

const CONFIRMATION = 'The cache has been emptied.'

void test('a read empties the cache and answers with the confirmation as a message', async () => {
  const server = fakeServer(pageReply(pageHtml(adminNoticeCard(CONFIRMATION))))
  const answer = await adminClearCache(sessionOn(server))
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.url.href, CLEAR_CACHE_URL)
  assert.equal(server.requests[0]!.headers['Cookie'], `2Moons=${TOKEN}`)

  assert.deepEqual(answer.data, { kind: 'message', message: CONFIRMATION })

  assert.equal(server.requests.length, 1)
})

void test('a session the script refuses is reported as the redirect it answered with', async () => {
  const server = fakeServer({ status: 302, headers: { Location: './index.php?page=login' } })
  const answer = await adminClearCache(sessionOn(server))
  assert.deepEqual(answer.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}index.php?page=login`),
  })
})

void test('an answer that carries nothing is reported as the empty receipt it is', async () => {
  const answer = await adminClearCache(sessionOn(fakeServer({ body: '' })))
  assert.deepEqual(answer.data, { kind: 'empty' })
})
