import assert from 'node:assert/strict'
import { test } from 'node:test'

import { publicLogin } from '../../../src/index.ts'
import { BAN_LIST_BODY, REFUSAL_CARD_BODY } from '../../fixtures/public/index.ts'
import {
  BASE_URL,
  TOKEN,
  answer,
  expectOperation,
  fakeServer,
  pageHtml,
  pageReply,
  sessionOn,
} from '../../helpers.ts'

const LOGIN_URL = `${BASE_URL}index.php?page=login&uni=42`

const CREDENTIALS = { username: 'AhMisty', password: 'hunter2' }

void test('the credentials are posted to the page, under the field names its form submits', async () => {
  const server = await expectOperation((session) => publicLogin(session, CREDENTIALS), {
    method: 'POST',
    url: LOGIN_URL,
    body: [
      ['username', 'AhMisty'],
      ['password', 'hunter2'],
    ],
  })
  assert.equal(server.requests[0]!.headers['Content-Type'], 'application/x-www-form-urlencoded')

  assert.equal(server.requests[0]!.headers['Cookie'], undefined)
})

void test('a confirmed public login retains the token for subsequent requests', async () => {
  const server = fakeServer({
    status: 302,
    headers: { Location: 'game.php', 'Set-Cookie': `2Moons=${TOKEN}; path=/` },
  })
  const session = sessionOn(server, { sessionToken: '' })
  const observed = await publicLogin(session, CREDENTIALS)
  assert.deepEqual(observed.data, {
    kind: 'login',
    sessionToken: TOKEN,
  })
  assert.equal(session.sessionToken, TOKEN)
  await session.request({ url: session.endpoint('game.php') })
  assert.equal(server.requests[1]!.headers.Cookie, `2Moons=${TOKEN}`)
})

void test('a login rejection raises the server authentication code', async () => {
  await assert.rejects(
    answer((session) => publicLogin(session, CREDENTIALS), {
      status: 302,
      headers: { Location: 'index.php?code=1' },
    }),
    { code: 'server', serverCode: '1' },
  )
})

void test('an answer the server refused with is reported as the message it printed', async () => {
  const observed = await answer(
    (session) => publicLogin(session, CREDENTIALS),
    pageReply(pageHtml(REFUSAL_CARD_BODY)),
  )
  assert.deepEqual(observed.data, { kind: 'message', message: 'Wrong password' })
})

void test('a document is reported as the page it is, never as a decoded document', async () => {
  const observed = await answer(
    (session) => publicLogin(session, CREDENTIALS),
    pageReply(pageHtml(BAN_LIST_BODY)),
  )
  assert.deepEqual(observed.data, { kind: 'page' })
})

void test('an empty body is reported as its own kind', async () => {
  const observed = await answer((session) => publicLogin(session, CREDENTIALS), { body: '' })
  assert.deepEqual(observed.data, { kind: 'empty' })
})
