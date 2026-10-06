import assert from 'node:assert/strict'
import { test } from 'node:test'

import { chat } from '../../../src/index.ts'
import { BASE_URL, fakeServer, gamePage, pageReply, sessionOn } from '../../helpers.ts'

const CHAT_URL = `${BASE_URL}game.php?page=chat`

void test('going to the chat asks the page’s own address once', async () => {
  const server = fakeServer({ status: 302, headers: { Location: 'https://chat.example.com/room' } })
  const observed = await chat(sessionOn(server))
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.url.href, CHAT_URL)
  assert.equal(server.requests[0]!.url.searchParams.has('cp'), false)
  assert.deepEqual(observed.data, {
    kind: 'redirect',
    target: new URL('https://chat.example.com/room'),
  })
})

void test('an installation whose chat address is not a URL prints a message instead', async () => {
  const observed = await chat(
    sessionOn(
      fakeServer(pageReply(gamePage('<div class="ally_contents">No chat configured</div>'))),
    ),
  )
  assert.deepEqual(observed.data, { kind: 'message', message: 'No chat configured' })
})

void test('a session that had expired is reported as the login redirect', async () => {
  const observed = await chat(
    sessionOn(fakeServer({ status: 302, headers: { Location: './index.php?page=login' } })),
  )
  assert.deepEqual(observed.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}index.php?page=login`),
  })
})
