import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { DispatchFleetOptions, Session } from '../src/index.ts'
import {
  FleetMission,
  ServerError,
  dispatchFleet,
  sendBuddyRequest,
  sendMessage,
  snapshotPlanet,
  snapshotAccount,
} from '../src/index.ts'
import {
  fleetStep1PreviewBody,
  fleetStep2Body,
  fleetStep3DispatchReceiptBody,
} from './fixtures/game/space.ts'
import { fakeServer, gamePage, pageHtml, pageReply, sessionOn } from './helpers.ts'

const FLEET: DispatchFleetOptions = {
  origin: { planetId: 1000 },
  ships: new Map([[202, 5]]),
  target: { galaxy: 1, system: 2, planet: 4, type: 1 },
  speed: 10,
  mission: FleetMission.Transport,
  cargo: { metal: 100 },
}

const COMPOSE = [
  '<div class="message_recipient_name">Scout [1:2:3]</div>',
  '<form name="message" action="" method="post">',
  '<input type="text" name="subject" value="Re: Report">',
  '<textarea name="text"></textarea>',
  '</form>',
].join('')

const BUDDY = [
  '<form name="buddy" action="game.php?page=buddyList&amp;mode=send" method="post">',
  '<input type="hidden" name="id" value="7">',
  '<input type="text" readonly value="Scout [1:2:4]">',
  '<textarea name="text"></textarea>',
  '</form>',
].join('')

void test('dispatchFleet carries the server token through all three requests', async () => {
  const server = fakeServer([
    pageReply(gamePage(fleetStep1PreviewBody)),
    pageReply(gamePage(fleetStep2Body)),
    pageReply(gamePage(fleetStep3DispatchReceiptBody)),
  ])
  const result = await dispatchFleet(sessionOn(server), FLEET)
  assert.equal(result.stage, 'dispatch')
  if (result.stage !== 'dispatch') return
  assert.equal(result.dispatch.data.kind, 'fleetStep3')
  assert.equal(server.requests.length, 3)
  assert.equal(server.requests[1]!.body?.get('token'), result.draft.data.token)
  assert.equal(server.requests[2]!.body?.get('token'), result.destination.data.token)
  assert.equal(server.requests[2]!.body?.get('metal'), '100')
})

for (const stage of ['draft', 'destination'] as const)
  void test(`dispatchFleet stops when the ${stage} selected another origin`, async () => {
    const server = fakeServer([
      pageReply(gamePage(fleetStep1PreviewBody, { planetId: stage === 'draft' ? 2000 : 1000 })),
      pageReply(gamePage(fleetStep2Body, { planetId: 2000 })),
    ])
    await assert.rejects(dispatchFleet(sessionOn(server), FLEET), (error: unknown) => {
      assert.ok(error instanceof ServerError)
      assert.equal(error.serverCode, 'planet-mismatch')
      assert.equal(error.message, 'Requested origin planet 1000, but the server selected 2000')
      assert.equal(error.response?.url.searchParams.get('cp'), '1000')
      return true
    })
    assert.equal(server.requests.length, stage === 'draft' ? 1 : 2)
  })

void test('dispatchFleet stops at a rejected draft or destination', async () => {
  const refused = { status: 302, headers: { Location: 'index.php?page=login' } }
  const first = fakeServer(refused)
  const draft = await dispatchFleet(sessionOn(first), FLEET)
  assert.equal(draft.stage, 'draft')
  assert.equal(first.requests.length, 1)

  const second = fakeServer([pageReply(gamePage(fleetStep1PreviewBody)), refused])
  const destination = await dispatchFleet(sessionOn(second), FLEET)
  assert.equal(destination.stage, 'destination')
  assert.equal(second.requests.length, 2)
})

void test('dispatchFleet preserves a refusal from the final request', async () => {
  const server = fakeServer([
    pageReply(gamePage(fleetStep1PreviewBody)),
    pageReply(gamePage(fleetStep2Body)),
    pageReply(gamePage('<div class="ally_contents">No fuel</div>')),
  ])
  const result = await dispatchFleet(sessionOn(server), FLEET)
  assert.equal(result.stage, 'dispatch')
  if (result.stage === 'dispatch')
    assert.deepEqual(result.dispatch.data, { planetId: 1000, kind: 'message', message: 'No fuel' })
})

void test('sendMessage opens the compose form before sending to its recipient', async () => {
  const server = fakeServer([pageReply(pageHtml(COMPOSE)), pageReply('"Message sent"')])
  const result = await sendMessage(sessionOn(server), {
    recipientId: 4242,
    text: 'Thanks',
  })
  assert.equal(result.stage, 'send')
  assert.equal(server.requests.length, 2)
  assert.equal(server.requests[1]!.url.searchParams.get('id'), '4242')
  assert.equal(server.requests[1]!.body?.get('subject'), 'Re: Report')
  assert.equal(server.requests[1]!.body?.get('text'), 'Thanks')
  if (result.stage === 'send')
    assert.deepEqual(result.send.data, { kind: 'json', value: 'Message sent' })

  const override = fakeServer([pageReply(pageHtml(COMPOSE)), pageReply('')])
  await sendMessage(sessionOn(override), {
    recipientId: 4242,
    subject: 'New subject',
    text: 'Hi',
  })
  assert.equal(override.requests[1]!.body?.get('subject'), 'New subject')
})

void test('sendMessage stops on a receipt instead of the compose form', async () => {
  const refused = fakeServer({ status: 302, headers: { Location: 'index.php?page=login' } })
  const stopped = await sendMessage(sessionOn(refused), {
    recipientId: 4242,
    text: 'Thanks',
  })
  assert.equal(stopped.stage, 'compose')
  assert.equal(refused.requests.length, 1)
})

void test('sendBuddyRequest reads its form before submitting the request', async () => {
  const server = fakeServer([
    pageReply(pageHtml(BUDDY)),
    pageReply(gamePage('<div class="ally_contents">Request sent</div>')),
  ])
  const result = await sendBuddyRequest(sessionOn(server), {
    playerId: 7,
    text: 'Hello',
  })
  assert.equal(result.stage, 'send')
  assert.equal(server.requests.length, 2)
  assert.equal(server.requests[1]!.body?.get('id'), '7')
  assert.equal(server.requests[1]!.body?.get('text'), 'Hello')
})

void test('sendBuddyRequest stops on a receipt instead of the request form', async () => {
  const refused = fakeServer({ status: 302, headers: { Location: 'index.php?page=login' } })
  const stopped = await sendBuddyRequest(sessionOn(refused), {
    playerId: 7,
    text: 'Hello',
  })
  assert.equal(stopped.stage, 'request')
  assert.equal(refused.requests.length, 1)
})

void test('snapshot methods validate their concurrency budget before making any request', async () => {
  for (const concurrency of [0, -1, 1.5, Infinity, Number.NaN]) {
    const methods = [
      (session: Session) => snapshotPlanet(session, { concurrency, planetId: 1000 }),
      (session: Session) => snapshotAccount(session, { concurrency, planetId: 1000 }),
    ]
    for (const method of methods) {
      const server = fakeServer()
      await assert.rejects(() => method(sessionOn(server)), { code: 'validation' })
      assert.equal(server.requests.length, 0)
    }
  }
})
