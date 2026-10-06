import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { FleetDealerPage } from '../../../src/index.ts'
import { ErrorCode, fleetDealer, fleetDealerSend } from '../../../src/index.ts'
import { fleetDealerPageContent, stockNode } from '../../fixtures/game/economy.ts'
import {
  BASE_URL,
  PLANET_ID,
  expectOperation,
  fakeServer,
  gamePage,
  pageReply,
  sessionOn,
  tickerHeader,
} from '../../helpers.ts'

const HEADER = tickerHeader({
  metal: ['1000', '10', '100000'],
  crystal: ['2000', '20', '200000'],
  deuterium: ['3000', '30', '300000'],
  energy: ['500', '1234'],
}).concat(stockNode('darkmatter', '4000'))

const COST_INFO = '{"202": ["15", "Light Cargo", {"901": 10, "902": 5}]}'

const READ_URL = `${BASE_URL}game.php?page=fleetDealer&cp=${PLANET_ID}`
const SEND_URL = `${BASE_URL}game.php?page=fleetDealer&cp=${PLANET_ID}&mode=send`

function document(costInfo = COST_INFO): string {
  return gamePage(fleetDealerPageContent(costInfo), { header: HEADER })
}

function dealerOf(answer: Awaited<ReturnType<typeof fleetDealer>>): FleetDealerPage {
  const data = answer.data
  if (data.kind !== 'fleetDealer') assert.fail(`expected the dealer, answered with ${data.kind}`)
  return data
}

void test('the dealer’s catalogue is read from the page’s own address', async () => {
  const server = fakeServer(pageReply(document()))
  const answer = await fleetDealer(sessionOn(server), { planetId: PLANET_ID })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.url.href, READ_URL)
  assert.equal(server.requests[0]!.url.searchParams.has('mode'), false)
  const dealer = dealerOf(answer)
  assert.equal(dealer.kind, 'fleetDealer')
  assert.equal(dealer.planetId, PLANET_ID)
  assert.equal(dealer.chargePercent, 30)
})

void test('the entries the dealer buys back come from its own script, priced by the unit', async () => {
  const dealer = dealerOf(
    await fleetDealer(sessionOn(fakeServer(pageReply(document()))), { planetId: PLANET_ID }),
  )
  assert.deepEqual(dealer.items, [
    {
      elementId: 202,
      name: 'Light Cargo',
      owned: 15,
      unitPrice: new Map([
        [901, 10],
        [902, 5],
      ]),
    },
  ])
})

void test('the balances beside the catalogue are the header’s own, one entry per resource', async () => {
  const dealer = dealerOf(
    await fleetDealer(sessionOn(fakeServer(pageReply(document()))), { planetId: PLANET_ID }),
  )
  assert.deepEqual(
    [...dealer.balances],
    [
      [901, 1000],
      [902, 2000],
      [903, 3000],
      [921, 4000],
    ],
  )
})

void test('a header that states no balance for a resource reports none rather than zero', async () => {
  const withoutHeader = gamePage(fleetDealerPageContent(COST_INFO))
  const dealer = dealerOf(
    await fleetDealer(sessionOn(fakeServer(pageReply(withoutHeader))), { planetId: PLANET_ID }),
  )
  assert.equal(dealer.balances.get(921), null)
})

void test('selling units back is sent to the page’s own mode', async () => {
  const server = await expectOperation(
    (session) => fleetDealerSend(session, { planetId: PLANET_ID, elementId: 202, amount: 5 }),
    {
      method: 'POST',
      url: SEND_URL,
      body: [
        ['shipID', '202'],
        ['count', '5'],
      ],
    },
  )
  assert.equal(server.requests[0]!.url.searchParams.get('mode'), 'send')
})

void test('a catalogue entry the page could not have bound is a decoding failure', async () => {
  const malformed: [string, string, string][] = [
    ['an entry that is not an array', '{"202": 5}', 'Invalid fleet dealer item'],
    ['an entry of two values', '{"202": ["15", "Light Cargo"]}', 'Invalid fleet dealer item'],
    [
      'an inventory that is not numeric',
      '{"202": [null, "Light Cargo", {"901": 10}]}',
      'Expected a numeric value',
    ],
    ['a name that is not text', '{"202": ["15", null, {"901": 10}]}', 'Invalid fleet dealer item'],

    [
      'a price table that is not an object',
      '{"202": ["15", "Light Cargo", 5]}',
      'Expected static object',
    ],
  ]
  for (const [name, costInfo, message] of malformed)
    await assert.rejects(
      () =>
        fleetDealer(sessionOn(fakeServer(pageReply(document(costInfo)))), { planetId: PLANET_ID }),
      { code: ErrorCode.ParseError, message },
      name,
    )
})

void test('a document without either binding is a decoding failure', async () => {
  const withoutCatalogue = document().replace(/var CostInfo = .*?;\n/, '')
  await assert.rejects(
    () => fleetDealer(sessionOn(fakeServer(pageReply(withoutCatalogue))), { planetId: PLANET_ID }),
    { code: ErrorCode.ParseError, message: 'Expected one CostInfo binding, found 0' },
  )
  const withoutCharge = document().replace(/var Charge = 30;/, '')
  await assert.rejects(
    () => fleetDealer(sessionOn(fakeServer(pageReply(withoutCharge))), { planetId: PLANET_ID }),
    { code: ErrorCode.ParseError, message: 'Expected one Charge binding, found 0' },
  )
})
