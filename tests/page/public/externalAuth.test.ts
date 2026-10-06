import assert from 'node:assert/strict'
import { test } from 'node:test'

import { publicExternalAuth } from '../../../src/index.ts'
import { REFUSAL_CARD_BODY } from '../../fixtures/public/index.ts'
import {
  BASE_URL,
  answer,
  expectOperation,
  fakeServer,
  pageHtml,
  pageReply,
  sessionOn,
} from '../../helpers.ts'

void test('the provider the caller names travels as the address’s own method', async () => {
  await expectOperation((session) => publicExternalAuth(session, { method: 'facebook' }), {
    url: `${BASE_URL}index.php?method=facebook&page=externalAuth&uni=42`,
  })
})

void test('a matching account is reported as the redirect to the game script', async () => {
  const observed = await answer((session) => publicExternalAuth(session, { method: 'facebook' }), {
    status: 302,
    headers: { Location: 'game.php' },
  })
  assert.deepEqual(observed.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}game.php`),
  })
})

void test('a hand-off that found its account logs the session in and keeps the cookie', async () => {
  const server = fakeServer({
    status: 302,
    headers: { Location: 'game.php', 'Set-Cookie': ['2Moons=handed-off; path=/'] },
  })
  const session = sessionOn(server, { sessionToken: '' })
  const observed = await publicExternalAuth(session, { method: 'facebook' })
  assert.deepEqual(observed.data, { kind: 'login', sessionToken: 'handed-off' })
  assert.equal(session.sessionToken, 'handed-off')
})

void test('no cookie of the asking session’s own reaches the hand-off', async () => {
  const server = await expectOperation(
    (session) => publicExternalAuth(session, { method: 'facebook' }),
    {},
  )
  assert.equal(server.requests[0]!.headers['Cookie'], undefined)
})

void test('provider failure redirects raise their authentication codes', async () => {
  const codes: [string, string][] = [
    ['inactive', '5'],
    ['invalid', '4'],
  ]
  for (const [name, code] of codes) {
    await assert.rejects(
      answer((session) => publicExternalAuth(session, { method: 'facebook' }), {
        status: 302,
        headers: { Location: `index.php?code=${code}` },
      }),
      { code: 'server', serverCode: code },
      name,
    )
  }
})

void test('an identity without an account is reported as the registration form’s address', async () => {
  const observed = await answer((session) => publicExternalAuth(session, { method: 'facebook' }), {
    status: 302,
    headers: {
      Location: 'index.php?page=register&externalAuth[account]=uid-1&externalAuth[method]=facebook',
    },
  })
  assert.deepEqual(observed.data, {
    kind: 'redirect',
    target: new URL(
      `${BASE_URL}index.php?page=register&externalAuth[account]=uid-1&externalAuth[method]=facebook`,
    ),
  })
})

void test('an attempt the server refused is reported as the message it printed', async () => {
  const observed = await answer(
    (session) => publicExternalAuth(session, { method: 'facebook' }),
    pageReply(pageHtml(REFUSAL_CARD_BODY)),
  )
  assert.deepEqual(observed.data, { kind: 'message', message: 'Wrong password' })
})

void test('an answer carrying nothing is reported as its own kind', async () => {
  const observed = await answer((session) => publicExternalAuth(session, { method: 'facebook' }), {
    body: '',
  })
  assert.deepEqual(observed.data, { kind: 'empty' })
})
