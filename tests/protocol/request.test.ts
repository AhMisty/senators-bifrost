import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { PlanetData } from '../../src/index.ts'
import { GAME_ROUTES, readAck, readReply, routeAck, routePage } from '../../src/index.ts'
import type { Reply } from '../helpers.ts'
import { BASE_URL, fakeServer, gamePage, httpResponse, pageReply, sessionOn } from '../helpers.ts'

const SESSION = sessionOn(fakeServer())

void test('planet receipts report the HTML marker or null without inferring from cp', () => {
  const cases: [Reply, object][] = [
    [
      pageReply(gamePage('<div class="ally_contents">Refused</div>', { planetId: 777 })),
      { kind: 'message', message: 'Refused', planetId: 777 },
    ],
    [pageReply(gamePage('<p>Ready</p>', { planetId: 777 })), { kind: 'page', planetId: 777 }],
    [pageReply('<p>Ready</p>'), { kind: 'page', planetId: null }],
    [{ body: '{"ok":"Saved"}' }, { kind: 'json', value: { ok: 'Saved' }, planetId: null }],
    [{ body: 'OK' }, { kind: 'text', text: 'OK', planetId: null }],
    [{ body: '' }, { kind: 'empty', planetId: null }],
    [
      { status: 302, headers: { Location: './game.php?page=overview&cp=999' } },
      {
        kind: 'redirect',
        target: new URL(`${BASE_URL}game.php?page=overview&cp=999`),
        planetId: null,
      },
    ],
  ]
  for (const [reply, expected] of cases) {
    const response = httpResponse(reply)
    const observed = readAck(SESSION, response, true)
    assert.deepEqual(observed.data, expected)
    assert.equal(observed.response, response)
    assert.equal('requestedPlanetId' in observed.data, false)
  }
})

void test('planet document results reuse the decoded data and its actual planet', () => {
  type Document = PlanetData<{ kind: 'example'; value: string }>
  let decoded: Document | undefined
  const response = httpResponse(pageReply(gamePage('<p>Ready</p>', { planetId: 777 })))
  const observed = readReply(
    SESSION,
    response,
    (page) => {
      decoded = { kind: 'example', value: page.one('p').text(), planetId: page.planetId() }
      assert.equal(page.optionalPlanetId(), 777)
      return decoded
    },
    true,
  )
  assert.equal(observed.data, decoded)
  assert.deepEqual(observed.data, { kind: 'example', value: 'Ready', planetId: 777 })
})

void test('a planet document without its own context receives the observed marker', () => {
  const response = httpResponse(pageReply(gamePage('<p>Ready</p>', { planetId: 777 })))
  let decodes = 0
  const observed = readReply(
    SESSION,
    response,
    (page) => {
      decodes++
      return { kind: 'example', value: page.one('p').text() }
    },
    true,
  )
  assert.equal(decodes, 1)
  assert.deepEqual(observed.data, { kind: 'example', value: 'Ready', planetId: 777 })
})

void test('planet route readers each make one request and report the response planet', async () => {
  const server = fakeServer([
    pageReply(gamePage('<p>Ready</p>', { planetId: 777 })),
    pageReply(gamePage('<div class="ally_contents">Saved</div>', { planetId: 888 })),
  ])
  const session = sessionOn(server)
  const document = await routePage(session, GAME_ROUTES.overview, { planetId: 1000 }, (page) => ({
    kind: 'example',
    value: page.one('p').text(),
  }))
  const receipt = await routeAck(session, GAME_ROUTES.overview, { planetId: 1000 })
  assert.deepEqual(document.data, { kind: 'example', value: 'Ready', planetId: 777 })
  assert.deepEqual(receipt.data, { kind: 'message', message: 'Saved', planetId: 888 })
  assert.equal(server.requests.length, 2)
  for (const request of server.requests) assert.equal(request.url.searchParams.get('cp'), '1000')
})

void test('unscoped protocol readers keep the plain receipt contract', () => {
  const response = httpResponse(pageReply(gamePage('<div class="ally_contents">Saved</div>')))
  assert.deepEqual(readAck(SESSION, response).data, { kind: 'message', message: 'Saved' })
})
