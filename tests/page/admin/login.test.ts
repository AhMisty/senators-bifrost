import assert from 'node:assert/strict'
import { test } from 'node:test'

import { adminActive, adminDump, adminLogin, adminUniverseSettings } from '../../../src/index.ts'
import { ADMIN_LOGIN_CARD_BODY } from '../../fixtures/admin/index.ts'
import { BASE_URL, fakeServer, pageHtml, pageReply, sessionOn } from '../../helpers.ts'

const ADMIN_URL = `${BASE_URL}admin.php`

void test('an admin login form identifies an administrative-access failure', async () => {
  for (const request of [adminActive, adminDump, adminUniverseSettings]) {
    await assert.rejects(
      request(sessionOn(fakeServer(pageReply(pageHtml(ADMIN_LOGIN_CARD_BODY))))),
      {
        code: 'server',
        serverCode: 'admin-authentication',
      },
    )
  }
})

function redirectTo(file: string): { status: number; headers: Record<string, string> } {
  return { status: 302, headers: { Location: `./${file}` } }
}

void test('the password is submitted to the bare administrative script', async () => {
  const server = fakeServer(redirectTo('admin.php'))
  await adminLogin(sessionOn(server), { password: 'hunter2' })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'POST')

  assert.equal(server.requests[0]!.url.href, ADMIN_URL)
  assert.deepEqual(
    [...(server.requests[0]!.body ?? new URLSearchParams())],
    [['admin_pw', 'hunter2']],
  )
  assert.equal(server.requests[0]!.headers['Cookie'], '2Moons=a1b2c3')
})

void test('an empty password is still a submission, because the guard is presence', async () => {
  const server = fakeServer(redirectTo('admin.php'))
  await adminLogin(sessionOn(server), { password: '' })
  assert.deepEqual([...(server.requests[0]!.body ?? new URLSearchParams())], [['admin_pw', '']])
})

void test('a matched password is reported as the redirect back to the script', async () => {
  const answer = await adminLogin(sessionOn(fakeServer(redirectTo('admin.php'))), {
    password: 'hunter2',
  })
  assert.deepEqual(answer.data, { kind: 'redirect', target: new URL(ADMIN_URL) })
})

void test('a player session raises the administrative-access failure', async () => {
  await assert.rejects(
    adminLogin(sessionOn(fakeServer(redirectTo('game.php'))), { password: 'hunter2' }),
    { code: 'server', serverCode: 'admin-authentication' },
  )
})

void test('a rejected password raises the administrative-access failure', async () => {
  const body = pageReply(pageHtml(ADMIN_LOGIN_CARD_BODY))
  await assert.rejects(adminLogin(sessionOn(fakeServer(body)), { password: 'wrong' }), {
    code: 'server',
    serverCode: 'admin-authentication',
  })
})

void test('an answer that carries nothing is reported as the empty receipt it is', async () => {
  const answer = await adminLogin(sessionOn(fakeServer({ body: '' })), { password: 'hunter2' })
  assert.deepEqual(answer.data, { kind: 'empty' })
})
