import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Session, logout } from '../../../src/index.ts'
import { BASE_URL, TOKEN, fakeServer, gamePage, pageReply, sessionOn } from '../../helpers.ts'

const LOGOUT_URL = `${BASE_URL}game.php?page=logout`

void test('ending a session asks the page’s own address with the session’s own cookie', async () => {
  const server = fakeServer(
    pageReply(gamePage('<div class="ally_contents">You are logged out</div>')),
  )
  const session = sessionOn(server)
  const observed = await logout(session)
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')

  assert.equal(server.requests[0]!.url.href, LOGOUT_URL)
  assert.equal(server.requests[0]!.headers['Cookie'], `2Moons=${TOKEN}`)
  assert.deepEqual(observed.data, { kind: 'message', message: 'You are logged out' })
})

void test('the token is cleared whatever the endpoint answers', async () => {
  const session = sessionOn(fakeServer(pageReply(gamePage('<div class="ally_contents">Bye</div>'))))
  await logout(session)
  assert.equal(session.sessionToken, '')
})

void test('a session that had already expired is cleared all the same', async () => {
  const session = sessionOn(
    fakeServer({ status: 302, headers: { Location: './index.php?page=login' } }),
  )
  const observed = await logout(session)
  assert.deepEqual(observed.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}index.php?page=login`),
  })
  assert.equal(session.sessionToken, '')
})

void test('the token is cleared after a response even if its body cannot be decoded', async () => {
  const session = sessionOn(
    fakeServer({ body: '{', headers: { 'Content-Type': 'application/json' } }),
  )
  await assert.rejects(logout(session), { code: 'parse' })
  assert.equal(session.sessionToken, '')
})

void test('a request that never reached the endpoint leaves the token standing', async () => {
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 42,
    sessionToken: TOKEN,
    fetch: () => Promise.reject(new Error('network down')),
  })
  await assert.rejects(() => logout(session))
  assert.equal(session.sessionToken, TOKEN)
})

void test('a logged-out session presents no token afterwards', async () => {
  const server = fakeServer([
    pageReply(gamePage('<div class="ally_contents">You are logged out</div>')),
    pageReply(gamePage('<div class="ally_contents">Nothing here</div>')),
  ])
  const session = sessionOn(server)
  await logout(session)

  await session.request({ url: new URL(LOGOUT_URL) })
  assert.equal(server.requests[1]!.headers['Cookie'], undefined)
})
