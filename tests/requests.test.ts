import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ServerError, get, post } from '../src/index.ts'
import { BASE_URL, TOKEN, fakeServer, pageReply, sessionOn } from './helpers.ts'

const BODY = pageReply('<html><body><p>ok</p></body></html>')

void test('a get resolves its address against the installation and carries the session', async () => {
  const server = fakeServer(BODY)
  const response = await get(sessionOn(server), { url: 'game.php?page=overview&cp=1000' })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.url.href, `${BASE_URL}game.php?page=overview&cp=1000`)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.body, null)
  assert.equal(server.requests[0]!.headers['Cookie'], `2Moons=${TOKEN}`)
  assert.equal(response.status, 200)
  assert.equal(response.body, BODY.body)
})

void test('a get resolves an absolute address the same way', async () => {
  const server = fakeServer(BODY)
  await get(sessionOn(server), { url: `${BASE_URL}json.php` })
  assert.equal(server.requests[0]!.url.href, `${BASE_URL}json.php`)
})

void test('a post writes its parameters as a form body', async () => {
  const server = fakeServer(BODY)
  await post(sessionOn(server), { url: 'game.php?page=settings&mode=send', body: { delete: 1 } })
  assert.equal(server.requests[0]!.method, 'POST')
  assert.equal(server.requests[0]!.url.href, `${BASE_URL}game.php?page=settings&mode=send`)
  assert.deepEqual([...(server.requests[0]!.body ?? [])], [['delete', '1']])
  assert.equal(server.requests[0]!.headers['Content-Type'], 'application/x-www-form-urlencoded')
})

void test('a post accepts the three shapes a parameter set comes in', async () => {
  const server = fakeServer([BODY, BODY, BODY])
  const session = sessionOn(server)
  await post(session, { url: 'a.php', body: { b: 2, c: 'x' } })
  await post(session, { url: 'a.php', body: new URLSearchParams([['b', '2']]) })
  await post(session, { url: 'a.php', body: 'b=2&c=x' })
  assert.deepEqual(
    [...(server.requests[0]!.body ?? [])],
    [
      ['b', '2'],
      ['c', 'x'],
    ],
  )
  assert.deepEqual([...(server.requests[1]!.body ?? [])], [['b', '2']])
  assert.deepEqual(
    [...(server.requests[2]!.body ?? [])],
    [
      ['b', '2'],
      ['c', 'x'],
    ],
  )
})

void test('a post of no parameters still sends a body', async () => {
  const server = fakeServer(BODY)
  await post(sessionOn(server), { url: 'a.php', body: {} })
  assert.equal(server.requests[0]!.body?.size, 0)
})

void test('raw helpers keep session credentials inside the installation', async () => {
  const server = fakeServer()
  const session = sessionOn(server)
  await assert.rejects(get(session, { url: 'https://other.example/game.php' }), {
    code: 'validation',
  })
  await assert.rejects(post(session, { url: '../other.php', body: {} }), {
    code: 'validation',
  })
  assert.equal(server.requests.length, 0)
})

void test('an HTTP failure raises a server error retaining its complete body', async () => {
  const server = fakeServer({ status: 404, body: 'gone' })
  await assert.rejects(get(sessionOn(server), { url: 'a.php' }), (error: unknown) => {
    assert.ok(error instanceof ServerError)
    assert.equal(error.response?.status, 404)
    assert.equal(error.response?.body, 'gone')
    assert.equal(error.serverCode, 404)
    return true
  })
})
