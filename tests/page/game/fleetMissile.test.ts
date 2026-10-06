import assert from 'node:assert/strict'
import { test } from 'node:test'

import { fleetMissile } from '../../../src/index.ts'
import { BASE_URL, PLANET_ID, answer, expectOperation, gamePage, pageReply } from '../../helpers.ts'

const MISSILE_URL = `${BASE_URL}game.php?page=fleetMissile&cp=${PLANET_ID}`

void test('a strike posts its target, its count and the defence it aims at', async () => {
  await expectOperation(
    (session) =>
      fleetMissile(session, {
        origin: { planetId: PLANET_ID },
        target: { galaxy: 1, system: 2, planet: 4, type: 3 },
        amount: 12,
        primaryTargetId: 401,
      }),
    {
      method: 'POST',
      url: MISSILE_URL,
      body: [
        ['galaxy', '1'],
        ['system', '2'],
        ['planet', '4'],
        ['type', '3'],
        ['SendMI', '12'],

        ['Target', '401'],
      ],
    },
  )
})

void test('a strike that names no defence element lets the endpoint pick its own target', async () => {
  await expectOperation(
    (session) =>
      fleetMissile(session, {
        origin: { planetId: PLANET_ID },
        target: { galaxy: 1, system: 2, planet: 3, type: 1 },
        amount: 0,
      }),
    {
      method: 'POST',
      url: MISSILE_URL,
      body: [
        ['galaxy', '1'],
        ['system', '2'],
        ['planet', '3'],
        ['type', '1'],
        ['SendMI', '0'],

        ['Target', '0'],
      ],
    },
  )
})

void test('a launched strike is reported as the message that states the count', async () => {
  const observed = await answer(
    (session) =>
      fleetMissile(session, {
        origin: { planetId: PLANET_ID },
        target: { galaxy: 1, system: 2, planet: 4, type: 1 },
        amount: 12,
      }),
    pageReply(
      gamePage('<div class="ally_contents">12 missiles were launched towards [1:2:4]</div>'),
    ),
  )
  assert.deepEqual(observed.data, {
    planetId: 1000,
    kind: 'message',
    message: '12 missiles were launched towards [1:2:4]',
  })
})

void test('a refused strike is the same receipt as a launched one, carrying its reason', async () => {
  const refusals: [string, string][] = [
    ['the silo is empty', 'You have no missiles in your silo'],
    ['the target is out of range', 'The target is out of range'],
  ]
  for (const [name, message] of refusals) {
    const observed = await answer(
      (session) =>
        fleetMissile(session, {
          origin: { planetId: PLANET_ID },
          target: { galaxy: 1, system: 2, planet: 4, type: 1 },
          amount: 1,
        }),
      pageReply(gamePage(`<div class="ally_contents">${message}</div>`)),
    )
    assert.deepEqual(observed.data, { planetId: 1000, kind: 'message', message }, name)
  }
})

void test('a dispatch page is a receipt too: nothing here reads a document', async () => {
  const observed = await answer(
    (session) =>
      fleetMissile(session, {
        origin: { planetId: PLANET_ID },
        target: { galaxy: 1, system: 2, planet: 4, type: 1 },
        amount: 12,
      }),
    pageReply(gamePage('<div class="fleettab16"><div class="fleetstep1-3">Mission</div></div>')),
  )
  assert.deepEqual(observed.data, { planetId: 1000, kind: 'page' })
})

void test('an answer that is not a message page is reported as the kind it is', async () => {
  const observed = await answer(
    (session) =>
      fleetMissile(session, {
        origin: { planetId: PLANET_ID },
        target: { galaxy: 1, system: 2, planet: 4, type: 1 },
        amount: 1,
      }),
    { status: 302, headers: { Location: './index.php?page=login' } },
  )
  assert.deepEqual(observed.data, {
    planetId: null,
    kind: 'redirect',
    target: new URL(`${BASE_URL}index.php?page=login`),
  })
})
