import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildings,
  notifications,
  publicExternalAuth,
  publicIndex,
  publicRegister,
  statistics,
  settingsSend,
} from '../src/index.ts'
import { BASE_URL, TOKEN, fakeServer, sessionOn, settingsPage } from './helpers.ts'

void test('account settings ignore navigation fields on structural values and submit only the requested operation', async () => {
  const server = fakeServer({})
  const submission = {
    planetId: 7,
    form: { ...settingsPage(), vacation: true },
    accountDeletionEnabled: false,
    patch: {},
  }
  const result = await settingsSend(sessionOn(server), submission)
  assert.deepEqual(result.data, { kind: 'empty' })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.url.searchParams.has('cp'), false)
  assert.equal(server.requests[0]!.body?.has('vacation'), false)
  assert.equal(server.requests[0]!.body?.get('delete'), '0')
})

void test('business readers construct fixed fields even when a structural value carries transport options', async () => {
  const server = fakeServer({})
  const options = {
    planetId: 7,
    query: { cp: 8, extra: 'unused' },
    method: 'POST',
    body: { page: 'logout' },
    withCookie: false,
  }
  const result = await buildings(sessionOn(server), options)
  assert.deepEqual(result.data, { kind: 'empty', planetId: null })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.url.href, `${BASE_URL}game.php?page=buildings&cp=7`)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.headers['Cookie'], `2Moons=${TOKEN}`)
  assert.equal(server.requests[0]!.body, null)
})

void test('named filters and public language are encoded without forwarding undeclared fields', async () => {
  const server = fakeServer({})
  const session = sessionOn(server)
  const filters = { attacks: 2, destruction: 3, missiles: 4, extra: 5 }
  await notifications(session, filters)
  await statistics(session, { entityType: 2, rankingType: 5, rankRange: 101 })
  await publicIndex(session, { language: 'en', referralId: 7, errorCode: 2 })
  await publicRegister(session, {
    language: 'en',
    referralId: 7,
    externalAuth: { method: 'facebook', account: 'id&1' },
  })
  await session.login({ username: 'user', password: 'password', language: 'en' })
  assert.equal(server.requests[0]!.url.href, `${BASE_URL}json.php?ataks=2&unic=3&rakets=4`)
  assert.equal(
    server.requests[1]!.url.href,
    `${BASE_URL}game.php?who=2&type=5&range=101&page=statistics`,
  )
  assert.equal(
    server.requests[2]!.url.href,
    `${BASE_URL}index.php?lang=en&ref=7&code=2&page=index&uni=42`,
  )
  assert.equal(server.requests[3]!.url.searchParams.get('externalAuth[account]'), 'id&1')
  assert.equal(server.requests[3]!.url.searchParams.get('referralID'), '7')
  assert.equal(server.requests[4]!.url.searchParams.get('lang'), 'en')
  assert.deepEqual(
    [...server.requests[4]!.body!],
    [
      ['username', 'user'],
      ['password', 'password'],
    ],
  )
})

void test('external authentication encodes the fixed provider fields and carries no session cookie', async () => {
  const server = fakeServer({})
  const session = sessionOn(server)
  await publicExternalAuth(session, {
    method: 'facebook',
    language: 'en',
    code: 'a&b',
    state: 'state',
    signedRequest: 'signed',
    errorReason: 'denied',
  })
  await publicExternalAuth(session, { method: 'openid', identifier: 'https://identity.example/id' })
  const parameters = server.requests[0]!.url.searchParams
  assert.equal(parameters.get('code'), 'a&b')
  assert.equal(parameters.get('state'), 'state')
  assert.equal(parameters.get('signed_request'), 'signed')
  assert.equal(parameters.get('error_reason'), 'denied')
  assert.equal(
    server.requests[1]!.url.searchParams.get('openid_identifier'),
    'https://identity.example/id',
  )
  assert.equal(server.requests[1]!.url.searchParams.has('code'), false)
  assert.ok(server.requests.every((request) => request.headers['Cookie'] === undefined))
})
