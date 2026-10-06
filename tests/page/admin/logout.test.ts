import assert from 'node:assert/strict'
import { test } from 'node:test'

import { adminLogout } from '../../../src/index.ts'
import { ADMIN_LOGOUT_NOTICE_BODY } from '../../fixtures/admin/index.ts'
import { BASE_URL, fakeServer, pageHtml, pageReply, sessionOn } from '../../helpers.ts'

const LOGOUT_URL = `${BASE_URL}admin.php?page=logout`

void test('the session ends through the read, and the notice is reported as a message', async () => {
  const server = fakeServer(pageReply(pageHtml(ADMIN_LOGOUT_NOTICE_BODY)))
  const answer = await adminLogout(sessionOn(server))
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.url.href, LOGOUT_URL)

  assert.deepEqual(answer.data, {
    kind: 'message',
    message: 'lo_notify\nlo_continue',
  })
})

void test('the notice is a receipt and never a document', async () => {
  const body = pageReply(pageHtml(ADMIN_LOGOUT_NOTICE_BODY))
  const answer = await adminLogout(sessionOn(fakeServer(body)))

  assert.equal(answer.data.kind, 'message')
  assert.deepEqual(Object.keys(answer.data).toSorted(), ['kind', 'message'])
})

void test('a script that renders its own page instead is reported as that page', async () => {
  const body = pageReply(pageHtml('<main role="main"><div class="card mb-3">bye</div></main>'))
  const answer = await adminLogout(sessionOn(fakeServer(body)))
  assert.deepEqual(answer.data, { kind: 'page' })
})

void test('an installation that redirects instead is reported as the redirect', async () => {
  const server = fakeServer({ status: 302, headers: { Location: './admin.php?page=overview' } })
  const answer = await adminLogout(sessionOn(server))
  assert.deepEqual(answer.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}admin.php?page=overview`),
  })
})
