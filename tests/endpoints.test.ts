import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Fetch, StaticValue } from '../src/index.ts'
import {
  ErrorCode,
  Session,
  combatReport,
  notifications,
  playerBanner,
  readNotifications,
  requestCronjob,
} from '../src/index.ts'
import {
  BASE_URL,
  TOKEN,
  fakeServer,
  gamePage,
  jsonResponse,
  pageReply,
  sessionOn,
} from './helpers.ts'

const GIF = new Uint8Array([71, 73, 70, 56, 57, 97])
const JPEG = new Uint8Array([255, 216, 255, 217])

function binaryServer(body = GIF, contentType = 'image/gif') {
  const requests: { url: URL; headers: Headers; redirect: RequestInit['redirect'] }[] = []
  const fetch: Fetch = async (input, init) => {
    assert.ok(input instanceof URL)
    requests.push({ url: input, headers: new Headers(init?.headers), redirect: init?.redirect })
    return new Response(body.buffer, { headers: { 'Content-Type': contentType, ETag: 'abc' } })
  }
  return {
    requests,
    session: new Session({ baseUrl: BASE_URL, universe: 42, sessionToken: TOKEN, fetch }),
  }
}

void test('the player banner keeps image bytes and sends a conditional tag when supplied', async () => {
  const server = binaryServer(JPEG, 'image/jpg')
  const response = await playerBanner(server.session, { playerId: 19, etag: 'abc' })
  assert.equal(server.requests[0]!.url.href, `${BASE_URL}userpic.php?id=19`)
  assert.equal(server.requests[0]!.headers.get('Cookie'), `2Moons=${TOKEN}`)
  assert.equal(server.requests[0]!.headers.get('If-None-Match'), 'abc')
  assert.equal(server.requests[0]!.redirect, 'manual')
  assert.equal(response.headers.get('ETag'), 'abc')
  assert.equal(response.headers.get('Content-Type'), 'image/jpg')
  assert.deepEqual(response.body, JPEG)
})

void test('the player banner can be requested without a conditional tag', async () => {
  const server = binaryServer()
  await playerBanner(server.session, { playerId: 20 })
  assert.equal(server.requests[0]!.headers.get('If-None-Match'), null)
})

void test('the cron job request keeps the image response and its request id', async () => {
  const server = binaryServer()
  const response = await requestCronjob(server.session, { cronjobId: 4 })
  assert.equal(server.requests[0]!.url.href, `${BASE_URL}cronjob.php?cronjobID=4`)
  assert.deepEqual(response.body, GIF)
})

void test('the combat report script reports its redirect without following it', async () => {
  const server = fakeServer({
    status: 302,
    headers: { Location: 'game.php?page=raport&raport=17' },
  })
  const answer = await combatReport(sessionOn(server), { reportId: '17' })
  assert.equal(server.requests[0]!.url.href, `${BASE_URL}CombatReport.php?raport=17`)
  assert.equal(answer.data.kind, 'redirect')
  if (answer.data.kind === 'redirect')
    assert.equal(answer.data.target.href, `${BASE_URL}game.php?page=raport&raport=17`)
})

const JSON_URL = `${BASE_URL}json.php`

const PAYLOAD = {
  ataks: 2,
  spio: 1,
  unic: 0,
  rakets: 3,
  msg: 5,
  SOUNDATAKS: true,
  SOUNDMSG: false,
}

const DECODED_PAYLOAD: { [key: string]: StaticValue } = {
  ataks: '2',
  spio: '1',
  unic: '0',
  rakets: '3',
  msg: '5',
  SOUNDATAKS: true,
  SOUNDMSG: false,
}

function payload(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ ...PAYLOAD, ...overrides })
}

const COUNTERS = {
  kind: 'notifications',
  attacks: 2,
  espionage: 1,
  destruction: 0,
  missiles: 3,
  messages: 5,
  attackSound: true,
  messageSound: false,
}

void test('the counters the header shows are decoded from the payload', async () => {
  const server = fakeServer(jsonResponse(payload()))
  const answer = await notifications(sessionOn(server))
  assert.deepEqual(answer.data, COUNTERS)

  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.url.href, JSON_URL)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.headers['Cookie'], `2Moons=${TOKEN}`)
})

void test('the counters the caller last saw travel as the poll’s own parameters', async () => {
  const server = fakeServer(jsonResponse(payload()))
  await notifications(sessionOn(server), { attacks: 1, missiles: 4 })
  assert.equal(server.requests[0]!.url.href, `${JSON_URL}?ataks=1&rakets=4`)
})

void test('a counter is read from the text the endpoint wrote, as far as a number carries it', () => {
  assert.equal(
    readNotifications({ ...DECODED_PAYLOAD, msg: '9007199254740993' }).messages,
    9007199254740992,
  )
})

void test('a refusal is reported as the message the endpoint printed', async () => {
  const body = pageReply(gamePage('<div class="ally_contents">Not permitted</div>'))
  const answer = await notifications(sessionOn(fakeServer(body)))
  assert.deepEqual(answer.data, { kind: 'message', message: 'Not permitted' })
})

void test('an answer that carries no payload is reported as the kind it is', async () => {
  const answers: [string, string][] = [
    ['an empty body', 'empty'],
    ['a bare number', 'text'],
  ]
  for (const [name, kind] of answers) {
    const body = kind === 'empty' ? '' : '1'
    const answer = await notifications(sessionOn(fakeServer({ body })))
    assert.equal(answer.data.kind, kind, name)
  }
})

void test('a payload the endpoint could not have written is a parse failure', async () => {
  const malformed: [string, string, string][] = [
    [
      'no sound flags',
      JSON.stringify({ ataks: 1, spio: 1, unic: 0, rakets: 0, msg: 0 }),
      'Malformed notification response',
    ],
    ['a flag that is not a boolean', payload({ SOUNDATAKS: 1 }), 'Malformed notification response'],

    [
      'a counter that is not a whole number',
      payload({ ataks: 1.5 }),
      'Expected a nonnegative whole number',
    ],
    ['a counter that is negative', payload({ ataks: -1 }), 'Expected a nonnegative whole number'],
    ['a counter that is not a number', payload({ ataks: 'two' }), 'Expected a numeric value'],
    ['an array', '[]', 'Expected static object'],
  ]
  for (const [name, body, message] of malformed) {
    await assert.rejects(
      () => notifications(sessionOn(fakeServer(jsonResponse(body)))),
      { code: ErrorCode.ParseError, message },
      name,
    )
  }
})

void test('a decoded payload is read into the counters without a request', () => {
  assert.deepEqual(readNotifications(DECODED_PAYLOAD), COUNTERS)
  assert.throws(() => readNotifications(null), {
    code: ErrorCode.ParseError,
    message: 'Expected static object',
  })
})
