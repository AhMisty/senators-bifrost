import assert from 'node:assert/strict'
import { test } from 'node:test'

import { board } from '../../../src/index.ts'
import { BASE_URL, fakeServer, gamePage, pageReply, sessionOn } from '../../helpers.ts'

const BOARD_URL = `${BASE_URL}game.php?page=board`

void test('going to the forum asks the page’s own address once', async () => {
  const server = fakeServer({ status: 302, headers: { Location: 'https://forum.example.com/' } })
  const observed = await board(sessionOn(server))
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.url.href, BOARD_URL)

  assert.equal(server.requests[0]!.url.searchParams.has('cp'), false)

  assert.deepEqual(observed.data, {
    kind: 'redirect',
    target: new URL('https://forum.example.com/'),
  })
})

void test('an installation whose forum address is not a URL prints a message instead', async () => {
  const observed = await board(
    sessionOn(
      fakeServer(pageReply(gamePage('<div class="ally_contents">No forum configured</div>'))),
    ),
  )
  assert.deepEqual(observed.data, { kind: 'message', message: 'No forum configured' })
})

void test('a session that had expired is reported as the login redirect', async () => {
  const observed = await board(
    sessionOn(fakeServer({ status: 302, headers: { Location: './index.php?page=login' } })),
  )
  assert.deepEqual(observed.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}index.php?page=login`),
  })
})
