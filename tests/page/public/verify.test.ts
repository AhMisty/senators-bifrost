import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Session } from '../../../src/index.ts'
import { ErrorCode, publicVerify, publicVerifyJson } from '../../../src/index.ts'
import { BAN_LIST_BODY, REFUSAL_CARD_BODY } from '../../fixtures/public/index.ts'
import {
  BASE_URL,
  answer,
  expectOperation,
  fakeServer,
  jsonResponse,
  pageHtml,
  pageReply,
  sessionOn,
} from '../../helpers.ts'

const VERTIFY_URL = `${BASE_URL}index.php?i=12&k=a1b2c3d4&page=vertify&uni=42`
const VERTIFY_JSON_URL = `${BASE_URL}index.php?i=12&k=a1b2c3d4&page=vertify&mode=json&uni=42`

const TOKEN = { verificationId: 12, key: 'a1b2c3d4' }

void test('the validation token travels in the address the mail printed', async () => {
  await expectOperation((session) => publicVerify(session, TOKEN), {
    url: `${BASE_URL}index.php?i=12&k=a1b2c3d4&page=vertify&uni=42`,
  })
})

void test('the activate mode is asked for at the page’s own route, with no mode at all', async () => {
  await expectOperation((session) => publicVerify(session, TOKEN), { url: VERTIFY_URL })
})

void test('an activated account is reported as the redirect to the game script', async () => {
  const observed = await answer((session) => publicVerify(session, TOKEN), {
    status: 302,
    headers: { Location: 'game.php' },
  })
  assert.deepEqual(observed.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}game.php`),
  })
})

void test('an activated account logs the session in and keeps the cookie it set', async () => {
  const server = fakeServer({
    status: 302,
    headers: { Location: 'game.php', 'Set-Cookie': ['2Moons=activated; path=/'] },
  })
  const session = sessionOn(server, { sessionToken: '' })
  const observed = await publicVerify(session, TOKEN)
  assert.deepEqual(observed.data, { kind: 'login', sessionToken: 'activated' })
  assert.equal(session.sessionToken, 'activated')
})

void test('activation carries no cookie of the asking session’s own', async () => {
  for (const run of [
    (session: Session) => publicVerify(session, TOKEN),
    (session: Session) => publicVerifyJson(session, TOKEN),
  ]) {
    const server = await expectOperation(run, {})
    assert.equal(server.requests[0]!.headers['Cookie'], undefined)
  }
})

void test('a token the server did not accept is reported as the message it printed', async () => {
  const observed = await answer(
    (session) => publicVerify(session, TOKEN),
    pageReply(pageHtml(REFUSAL_CARD_BODY)),
  )
  assert.deepEqual(observed.data, { kind: 'message', message: 'Wrong password' })
})

void test('a document is reported as the page it is, never as a decoded document', async () => {
  const observed = await answer(
    (session) => publicVerify(session, TOKEN),
    pageReply(pageHtml(BAN_LIST_BODY)),
  )
  assert.deepEqual(observed.data, { kind: 'page' })
})

void test('the json mode is a different route from the redirecting one', async () => {
  await expectOperation((session) => publicVerifyJson(session, TOKEN), { url: VERTIFY_JSON_URL })
})

void test('the json mode’s payload is the string it named the account with', async () => {
  const observed = await answer(
    (session) => publicVerifyJson(session, TOKEN),
    jsonResponse('"The account AhMisty was activated."'),
  )
  assert.deepEqual(observed.data, { kind: 'json', value: 'The account AhMisty was activated.' })
})

void test('a JSON body needs no header to be read as the payload it is', async () => {
  const observed = await answer((session) => publicVerifyJson(session, TOKEN), {
    body: '"Activated"',
  })
  assert.deepEqual(observed.data, { kind: 'json', value: 'Activated' })
})

void test('a rejection is reported as the message page, not as a payload', async () => {
  const observed = await answer(
    (session) => publicVerifyJson(session, TOKEN),
    pageReply(pageHtml(REFUSAL_CARD_BODY)),
  )
  assert.deepEqual(observed.data, { kind: 'message', message: 'Wrong password' })
})

void test('an empty body is reported as its own kind rather than as a payload', async () => {
  const observed = await answer((session) => publicVerifyJson(session, TOKEN), {
    body: '',
    headers: { 'Content-Type': 'application/json' },
  })
  assert.deepEqual(observed.data, { kind: 'empty' })
})

void test('a payload the endpoint could not have written raises rather than decoding', async () => {
  await assert.rejects(
    () => answer((session) => publicVerifyJson(session, TOKEN), jsonResponse('{nope')),
    { code: ErrorCode.ParseError, message: 'Invalid JSON response' },
  )
})
